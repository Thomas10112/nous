# 04 — Hors ligne et synchronisation

> Statut : **proposition à valider** (Phases 4 et 5 de la roadmap).

## 1. Ce qu'on veut, et ce qu'on refuse

**Voulu.** Lire, créer, modifier, supprimer, restaurer, ajouter des souvenirs et des
photos **sans réseau**, sans que l'interface le sache. Au retour du réseau : tout part,
tout arrive, sans bouton. Quand les deux sont connectés : temps réel.

**Refusé.** Un moteur de résolution de conflits (CRDT, merge champ par champ, historique
de versions). Règle unique : **dernière modification gagnante**, arbitrée par
`updated_at` posé par le client au moment du geste.

## 2. Pourquoi ne pas garder le store v1

Le store v1 (`src/data/store.tsx`) tient toute la base en mémoire, écrit de façon
optimiste puis, si `put()` échoue, **recharge tout** depuis le serveur : l'écriture faite
hors ligne est perdue (`writeItem` → `notify` + `reload`). Il n'a pas de file d'attente,
pas de curseur, et suppose qu'un `loadAll()` est bon marché. C'était juste pour un site
de quelques centaines d'entrées ; ça ne l'est plus pour un calendrier avec des milliers
d'événements, des occurrences calculées, des vidéos.

Ce qu'on garde de la v1 : **l'idée d'un contrat unique** derrière lequel l'UI ne sait pas
où sont les données. Ce contrat devient des *repositories* par entité, adossés à une base
locale réelle.

## 3. Architecture

```
UI (écrans, composants)
   │  hooks TanStack Query (useQuery / useMutation)
   ▼
Services de domaine        packages/domain   ← logique métier pure, testée en Node
   │  interfaces Repository
   ▼
Repositories SQLite        packages/data     ← Drizzle + expo-sqlite (mobile) / better-sqlite3 (tests)
   │  écrit la ligne + une entrée d'outbox dans la MÊME transaction
   ▼
SyncEngine                 packages/data/sync
   ├─ Pusher : draine l'outbox → Supabase (upsert LWW)
   ├─ Puller : demande les lignes dont server_updated_at > curseur, par table
   ├─ Realtime : canal couple:{id} → applique les changements à l'arrivée
   └─ MediaUploader : envoie les fichiers en attente, met à jour media.storage_path
```

La base locale est la **source de vérité de l'écran**. L'UI ne lit jamais le réseau. Le
réseau ne fait que remplir la base locale.

## 4. Base locale

- **expo-sqlite** (SDK 56) + **Drizzle** : schéma typé, migrations embarquées, mêmes
  tables que Postgres (§03) + colonnes locales :
  - `_dirty integer` (1 = modif locale non poussée) ;
  - sur `media` : `local_uri`, `local_thumb_uri`, `upload_status`.
- Tables locales seulement :
  - `outbox(seq, table, row_id, op, payload, created_at, attempts, last_error)` ;
  - `sync_state(table, cursor)` ;
  - `search_index` (FTS5, alimentée par triggers SQLite sur `events`, `memories`,
    `important_moments`, `moment_occurrences`, `chapters`) ;
  - `kv` (préférences d'affichage, `device_id`, dernier écran…).
- Les tests de repositories tournent en **Node avec better-sqlite3** : même schéma
  Drizzle, mêmes migrations, zéro simulateur.

## 5. Écriture locale

```
repo.update(id, patch)
  ├─ transaction SQLite :
  │    UPDATE table SET …patch, updated_at = now(), updated_by = me, updated_from = device, _dirty = 1
  │    INSERT INTO outbox(table, row_id, op='upsert', payload = ligne complète)
  ├─ émet DataEvents.emit('events')      → TanStack Query invalide les requêtes de la table
  └─ SyncEngine.kick()                   → tente un push tout de suite si en ligne
```

L'outbox stocke la **ligne complète** (pas le patch) : deux modifications successives du
même objet fusionnent en une seule entrée (dernier payload), et un `upsert` idempotent
suffit côté serveur. La suppression est un `upsert` avec `deleted_at`. Aucune opération
`delete` physique ne part du client.

## 6. Push (client → serveur)

- FIFO par `seq`, lots de 50, `upsert … on conflict (id) do update` via PostgREST.
- Réponse : la ligne telle que le serveur l'a gardée (LWW appliqué par trigger). Si elle
  diffère de ce qu'on a envoyé (quelqu'un d'autre avait modifié plus récemment), on
  l'applique localement : le perdant voit la version gagnante, sans dialogue.
- Erreur réseau : on garde l'entrée, on réessaie avec backoff (1 s → 2 → 4 → … 60 s) et à
  chaque retour en ligne (`NetInfo`) ou passage au premier plan.
- Erreur 4xx (RLS, validation) : entrée marquée `failed` avec `last_error`, visible dans
  Réglages → Synchronisation ; jamais rejouée en boucle.

## 7. Pull (serveur → client)

Par table : `select * where couple_id = … and server_updated_at > :cursor order by
server_updated_at limit 500`, en boucle jusqu'à épuisement, puis `cursor = max(server_updated_at)`.
Application ligne par ligne :

```
si ligne locale absente                           → insérer
sinon si locale._dirty = 1 et locale.updated_at ≥ distante.updated_at → garder la locale (elle partira au push)
sinon si distante.updated_at ≥ locale.updated_at  → remplacer
sinon                                             → ignorer (on a déjà plus récent ; rare : horloge)
```

Le pull tourne : au démarrage, au retour en ligne, au retour au premier plan, et quand le
temps réel signale un trou (reconnexion de canal). Il est **idempotent** : le rejouer ne
change rien.

Première ouverture : pull complet (curseur à zéro) avec un écran « On rapatrie vos
souvenirs… » ; les tables volumineuses (`messages`, `media`) sont paginées en priorité
inverse (récent d'abord).

## 8. Temps réel

Un seul canal Supabase Realtime **privé** par couple : `couple:{coupleId}`. Il porte
trois choses :

1. **Changements de données** — *Broadcast from Database* : un trigger Postgres
   (`realtime.broadcast_changes`) sur chaque table synchronisée publie `{table, op, row}`
   sur le topic du couple. Le client applique la ligne avec la même règle LWW que le pull,
   sauf si `row.updated_from = mon device_id` (écho de ma propre écriture → ignoré).
   Avantages sur `postgres_changes` : un seul topic pour toutes les tables, autorisation
   par RLS, pas de limite de filtres, et le message ressemble à une ligne de pull.
2. **Présence** — `channel.track({ user_id, device_id, screen, doing, at })`.
3. **Éphémère** — rien à envoyer côté client : les mentions « Mimi vient d'ajouter une
   activité » sont **dérivées** en local des changements reçus dont `updated_by ≠ moi`
   (table + op + ancienneté < 30 s → une petite bulle temporaire, jamais stockée).

Si le canal tombe (`CHANNEL_ERROR`, `TIMED_OUT`), le moteur passe en mode « pull
périodique » (30 s) jusqu'à reconnexion, et fait un pull à la reconnexion pour combler.

## 9. Médias

1. Choix (expo-image-picker) → compression locale (react-native-compressor : photo 1920 px
   q0.84 comme en v1, vidéo 1080p) → copie dans le dossier de l'app (`documentDirectory/media/{id}`)
   → miniature 480 px (ou image de vidéo) → ligne `media(upload_status='pending', local_uri)`
   → outbox.
2. `MediaUploader` : envoie l'original puis la miniature dans Storage (`{couple}/{id}.jpg`),
   met `storage_path`, `thumb_path`, `upload_status='uploaded'`, pousse la ligne.
   Reprise après coupure ; 3 échecs → `failed` + bouton « Réessayer ».
3. Lecture : `Img` demande `mediaUrl(media)` → si `local_uri` existe → fichier ; sinon URL
   signée (cache mémoire + `expo-image` cache disque) ; le fichier est téléchargé en
   arrière-plan pour rester disponible hors ligne (miniatures toujours, originaux à la
   demande).
4. Suppression : la ligne va à la corbeille ; la purge serveur retire l'objet Storage.

## 10. Identité de l'appareil et horloge

- `device_id` : UUID généré à l'installation, en `kv`.
- Horloge : `updated_at` = `max(Date.now(), dernier server_updated_at reçu)`. Si l'horloge
  de l'appareil est en retard, on ne peut pas « perdre » contre soi-même ; si elle est en
  avance, le pire cas est de gagner un conflit qu'on aurait dû perdre — acceptable pour
  deux personnes, et c'est exactement ce que dit la règle « dernière modification gagnante ».

## 11. Ce qui reste volontairement simple

- Pas de fusion de champs : une ligne entière gagne.
- Pas de tombstones permanentes : la purge à 30 jours efface ; un appareil resté hors
  ligne plus longtemps refait un pull complet (curseur remis à zéro si `sync_state`
  a plus de 30 jours).
- Pas de compression de l'outbox au-delà de la fusion par ligne.
- Pas de sync des préférences d'affichage par l'outbox : elles sont locales, avec copie
  dans `profiles.preferences` à la volée.

## 12. Tests attendus

- **Domaine** : LWW (matrice locale dirty / non dirty × plus récent / plus ancien),
  fusion d'outbox, ordre des messages avec `client_seq`.
- **Repositories** (Node + better-sqlite3) : écriture = ligne + outbox dans une
  transaction ; échec = rollback complet ; FTS mis à jour.
- **SyncEngine** avec un faux serveur en mémoire : push/pull/realtime dans tous les ordres,
  coupures aléatoires, écho de ses propres écritures, double appareil du même utilisateur.
- **Intégration** contre une instance Supabase locale (`supabase start`, Docker ; le
  *branching* hébergé est réservé au plan Pro) : triggers LWW, `broadcast_changes`, RLS
  croisée (le couple B ne voit rien du couple A).
