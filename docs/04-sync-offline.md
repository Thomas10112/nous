# 04 — Hors ligne et synchronisation

> Statut : **proposition à valider** (Phases 4 et 5), **version 2** après relecture
> contradictoire. Chaque règle ci-dessous a un test nommé en §12.

## 1. Ce qu'on veut, et ce qu'on refuse

**Voulu.** Lire, créer, modifier, supprimer, restaurer, ajouter des souvenirs et des
photos **sans réseau**, sans que l'interface le sache. Au retour du réseau : tout part,
tout arrive, sans bouton. Quand les deux sont connectés : temps réel.

**Refusé.** Un moteur de résolution de conflits. Règle unique : **dernière modification
gagnante**, arbitrée par le couple `(updated_at, updated_from)` posé par le client au
moment du geste ([03 §2.1](03-modele-de-donnees.md)). Deux exceptions serveur, et
seulement deux : le `done` d'une habitude est absorbant ; un tour de proposition
terminal est immuable.

## 2. Pourquoi ne pas garder le store v1

Le store v1 tient toute la base en mémoire et, si `put()` échoue, **recharge tout** :
l'écriture faite hors ligne est perdue (D1). Pas de file, pas de curseur, `loadAll()`
supposé gratuit (D3). Ce qu'on garde : l'idée d'un contrat unique derrière lequel l'UI
ne sait pas où sont les données. Il devient des repositories adossés à une base locale.

## 3. Architecture

```
UI (écrans, composants)
   │  hooks TanStack Query
   ▼
Services de domaine        packages/domain   ← logique métier pure
   │  interfaces Repository
   ▼
Repositories SQLite        packages/data     ← Drizzle + expo-sqlite (mobile) / better-sqlite3 (tests)
   │  ligne + outbox dans la MÊME transaction
   ▼
SyncEngine                 packages/data/sync
   ├─ Pusher     : outbox → Supabase (upsert), réponse = accusé de réception
   ├─ Puller     : (server_updated_at, id) > curseur, par table, fenêtre de recouvrement
   ├─ Realtime   : canal privé couple:{id} → indice de pull + présence
   └─ MediaUploader : envoie les fichiers (TUS), puis enfile la ligne media
```

La base locale est la source de vérité de l'écran. Le réseau ne fait que la remplir.

## 4. Base locale

- **Un fichier SQLite par compte** : `nous-{auth.uid}.db`, ouvert à la restauration de
  session, fermé (et conservé) à la déconnexion. Outbox, curseurs, index de recherche et
  corbeille locale appartiennent à leur compte ; le Pusher refuse de tourner si le
  compte connecté n'est pas le propriétaire du fichier ouvert.
- **expo-sqlite** + **Drizzle** : mêmes tables que Postgres (03) + colonnes locales sur
  `media` (`local_uri`, `local_thumb_uri`, `upload_status`, `upload_state`).
- Tables locales seulement :
  - `outbox(seq integer pk autoincrement, table_name, row_id, payload, created_at, attempts, last_error, status)` ;
  - `sync_state(table_name pk, cursor_ts, cursor_id, last_pull_at_server)` ;
  - `search_index` (FTS5 ; colonnes en §4.1) ;
- **`kv`** (`expo-sqlite/kv-store`, base distincte par appareil, hors compte — API
  synchrone, un module natif de moins que MMKV) : `device_id` (jamais modifié pour une
  installation), `serverOffset`, `lastEmittedAt`, `DisplayPreferences`, `slotZoom`,
  épinglages widget, dernier écran. **Jamais** de curseur ni d'outbox dans `kv` (base
  distincte, pas de transaction commune avec la base du compte).
- `_dirty` n'est pas une colonne : c'est `exists(select 1 from outbox where table_name = ? and row_id = ?)`.
- Les tests de repositories tournent en Node avec better-sqlite3 : même schéma, mêmes migrations.

### 4.1 Index de recherche (FTS5)

Colonnes : `title`, `body`, `location_name`, `location_city`, `category_label` (libellé FR),
`people` (prénoms de `owner_id` / `created_by` / `done_by`), `context` (titres des parents
liés : événement du souvenir, moment/occurrence du chapitre ou du souvenir, activité du
rattrapage), `date`. Maintenu par triggers SQLite sur `events`, `memories`,
`important_moments`, `moment_occurrences`, `chapters`, `habits` — y compris quand un
parent est renommé.

## 5. Écriture locale

```
repo.patch(id, patch)
  ├─ transaction SQLite :
  │    UPDATE t SET …patch, updated_at = clock(), updated_by = me, updated_from = device
  │    DELETE FROM outbox WHERE table_name = 't' AND row_id = id     -- jamais de fusion en place
  │    INSERT INTO outbox(table_name, row_id, payload = ligne complète)  -- nouveau seq
  ├─ DataEvents.emit('t')     → TanStack Query invalide la table
  └─ SyncEngine.kick()        → push si en ligne
```

Ligne complète dans l'outbox : upsert idempotent côté serveur, pas de rejeu de patchs. La
suppression est un `patch({ deleted_at })` ; la restauration aussi. Aucune opération
`delete` physique ne part du client. `clock()` = horloge locale corrigée (§10).

## 6. Push (client → serveur)

1. Tables dans l'**ordre du registre** (parents avant enfants), toutes les entrées d'une
   table ensemble, lots de 50, `upsert … on conflict (id) do update` via PostgREST,
   `RETURNING *`.
2. Le Pusher mémorise les `seq` envoyés et **acquitte par `(row_id, seq)`** : une entrée
   créée pendant que le push était en vol survit et repartira.
3. La réponse est un **accusé de réception** : les ids présents ont gagné (ligne
   appliquée localement seulement si plus aucune entrée d'outbox n'existe pour cet id) ;
   les ids **absents** ont perdu au LWW (le trigger a fait `return null`) → entrée
   supprimée, et si la ligne locale portait une modification de l'utilisateur, toast
   « Ta modification de « {titre} » a été remplacée par celle de {prénom} ». Choix
   délibéré face à l'alternative `NEW := OLD; return NEW` (qui renverrait la ligne gardée
   mais réécrirait un tuple identique et redéclencherait les triggers `after`) : ici,
   rien n'est écrit, rien n'est diffusé, et le pull qui suit rapporte la gagnante. Test
   pgTAP en Phase 3.
4. **Tout push est suivi d'un pull** des mêmes tables : c'est lui qui rapporte la version
   gagnante. Au retour en ligne : push, puis pull.
5. Erreur réseau : on garde, backoff 1 s → 60 s, réessai au retour en ligne (`NetInfo`) et
   au premier plan (`AppState`).
6. Erreur 4xx sur un lot : **rejouer les lignes une par une** pour isoler la coupable.
   `23503` (parent pas encore là) et `23505` → « réessayer plus tard » (au plus 5 fois) ;
   `P0030` (résurrection après purge) → entrée supprimée, ligne locale supprimée,
   message « Ce souvenir a été supprimé définitivement » ; autre code → `failed` avec
   `last_error`, visible dans Réglages → Synchronisation, jamais rejouée en boucle.
7. `serverOffset := server_updated_at de la réponse − Date.now()` (§10).

## 7. Pull (serveur → client)

```sql
select * from t
 where couple_id = :c
   and (server_updated_at, id) > (:cursor_ts - interval '60 seconds', :cursor_id)
 order by server_updated_at, id
 limit 500
```

- Pagination **par clé composée** (jamais `> max(ts)` seul : 800 lignes d'une même
  transaction partagent un instant) ; fenêtre de **recouvrement de 60 s** à chaque pull
  pour absorber les commits concurrents (03 §2.2) ; l'application est idempotente.
- Le curseur (`cursor_ts, cursor_id` = dernière ligne de la page, `last_pull_at_server`
  = horloge serveur de la réponse) est écrit **dans la même transaction SQLite** que la
  page appliquée.
- Application, par ligne :

```
pas d'entrée d'outbox pour cet id  → prendre la distante sans condition (le serveur est la référence)
entrée d'outbox                    → garder la locale ssi (local.updated_at, local.updated_from)
                                      > (distant.updated_at, distant.updated_from) ;
                                      sinon remplacer ET supprimer l'entrée d'outbox (+ toast §6.3)
```

- Quand : au démarrage, au retour en ligne, au premier plan, après chaque push, à
  chaque `SUBSCRIBED` du canal, et sur indice temps réel (§8) avec un debounce de 1 s
  par table.
- Première ouverture : pull complet (curseur zéro) avec écran « On rapatrie vos
  souvenirs… », tables volumineuses en dernier, miniatures avant originaux.

## 8. Temps réel

Un canal Supabase Realtime **privé** par couple : `couple:{coupleId}`.

**Serveur** (migration `0009_sync.sql`) :

```sql
-- diffusion des changements (trigger after sur chaque table lww, sauf nous.skip_broadcast)
perform realtime.broadcast_changes('couple:' || coalesce(NEW.couple_id, OLD.couple_id)::text,
                                   TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, NEW, OLD);
-- autorisation du canal
create policy "couple: recevoir" on realtime.messages for select to authenticated
  using (realtime.topic() = 'couple:' || auth_couple_id()::text
         and realtime.messages.extension in ('broadcast', 'presence'));
create policy "couple: presence" on realtime.messages for insert to authenticated
  with check (realtime.topic() = 'couple:' || auth_couple_id()::text
              and realtime.messages.extension = 'presence');
```

Contraintes du contrat *Broadcast from Database* et du plan gratuit : la fonction
trigger est `security definer set search_path = ''`, `after … for each row`, `return
null` ; chaque changement envoie `record` **et** `old_record` (compté deux fois dans le
quota) ; payload **≤ 256 Ko** sur le plan gratuit (un message plus gros est abandonné
sans erreur : le pull le rattrape — test en Phase 5 avec une ligne > 256 Ko) ;
100 messages/s, 200 connexions, ≤ 10 clés par objet de présence, 20 messages de
présence/s.

**Client** : `supabase.channel('couple:' + id, { config: { private: true } })`, `await
supabase.realtime.setAuth()` avant `subscribe()` **et à chaque `TOKEN_REFRESHED`** de
`onAuthStateChange`. Sur `CHANNEL_ERROR` / `TIMED_OUT` (JWT expiré en arrière-plan, socket
suspendue par iOS) : `auth.getSession()` (refresh), `realtime.setAuth(token)`,
re-`subscribe()`, puis pull. Tant que le canal est fermé : pull toutes les 30 s.

**Le broadcast est un indice, pas une source.** Payload
`{ operation, table, schema, record, old_record }` : on applique `record` de façon
optimiste s'il est petit et si le couple `(updated_at, updated_from)` est plus récent
que le local (même règle que §7), **et** on déclenche un pull debounced de la table. Une
perte (quota 100 msg/s du plan gratuit, payload > 256 Ko, socket suspendue) est alors
sans conséquence. Pas de règle d'écho par `updated_from` : un écho porte exactement mon
couple local → no-op naturel.

**Présence** : `channel.track({ user_id, device_id, screen, doing, at })`.

**Éphémère** : les mentions « Mimi vient d'ajouter une activité » sont dérivées des
changements reçus dont `updated_by ≠ moi` et `updated_at` < 30 s ; jamais stockées.

## 9. Médias

1. Choix (expo-image-picker) → compression locale (photo 1 920 px q0.84 ;
   vidéo 1080p ou 720p, `react-native-compressor` ≥ 2.0.3) → contrôle de
   **`media.maxUploadBytes`** (constante dérivée du plan Supabase : **50 Mo par fichier
   sur le plan gratuit**, proposer de recomprimer en 720p ou de couper ; 200 Mo seulement
   après passage au Pro — Q6) → copie dans `documentDirectory/media/{id}` → miniature
   480 px (photo : `expo-image-manipulator` ; vidéo : `expo-video`
   `player.generateThumbnailsAsync(0.5, { maxWidth: 480 })`, `expo-video-thumbnails`
   étant retiré depuis SDK 56) → ligne `media` **locale** (`upload_status = 'pending'`),
   **pas encore dans l'outbox**. Le souvenir parent, lui, part tout de suite (sa
   `cover_media_id` est une référence souple ; l'autre voit une case « photo en route »).
2. `MediaUploader` : > 6 Mo → **upload résumable TUS** (`tus-js-client` sur
   `/storage/v1/upload/resumable`, morceaux de 6 Mo lus par tranches, URL de reprise
   persistée dans `upload_state`) ; ≤ 6 Mo → upload standard, `upsert: true` (un
   réessai après réponse perdue n'est pas un 409). Puis miniature. Puis
   `upload_status = 'uploaded'`, `storage_path`, `thumb_path`, **et seulement alors**
   `enqueue` de la ligne avec `updated_at` bumpé. 3 échecs → `failed` + « Réessayer ».
3. Lecture : `local_uri` si présent ; sinon URL signée (cache mémoire + `expo-image`
   disque) ; miniatures toujours téléchargées en arrière-plan, originaux à la demande
   **et conservés localement** une fois téléchargés (l'egress du plan gratuit est de
   5 Go/mois : une vidéo revue cinq fois ne doit pas être re-téléchargée cinq fois).
4. Suppression → corbeille ; purge serveur → `storage_purge_queue` → Edge `purge-trash`
   appelée par l'app (03 §13).

## 10. Identité de l'appareil et horloge

- `device_id` : UUID à l'installation, en MMKV, jamais changé.
- Horloge locale **monotone et corrigée** :
  `updated_at = max(Date.now() + serverOffset, lastEmittedAt + 1 ms)`, `lastEmittedAt`
  en MMKV. `serverOffset` vient des réponses de push. Si `|serverOffset| > 2 min`,
  bandeau une fois dans Réglages → Synchronisation : « L'horloge de ce téléphone est
  décalée de N min ; tes modifications sont datées à l'heure du serveur ». Côté serveur,
  `sync_guard()` ramène à `now()` tout `updated_at` en avance de plus de 2 min : un
  appareil ne peut pas « verrouiller » des lignes dans le futur.

## 11. Corbeille locale, purge, reset

- À chaque ouverture, la même règle que le serveur : suppression des lignes locales
  `deleted_at < now() − 30 j`, de leurs fichiers et de leurs entrées d'outbox.
- **Reset du curseur** si `last_pull_at_server` a plus de **20 jours** (purge à 30 : marge
  de 10 jours) : `delete` des lignes locales sans entrée d'outbox, vidage de la FTS, puis
  pull complet. Les lignes en attente et l'outbox survivent ; une restauration dont le
  parent a été purgé échoue en `23503`/`P0030` et est retirée avec un message lisible.
- Changement de compte sur le même appareil : autre fichier SQLite (§4) ; rien ne se
  mélange, rien ne part sous une autre identité.

## 12. Tests attendus

| Règle                                             | Test                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Ordre total, égalités                             | matrice LWW (dirty × ordre) avec couples égaux ; « réponse HTTP avant broadcast antérieur »            |
| Outbox sans fusion en place                       | « édition pendant le push en vol » ; « suppression puis restauration en 200 ms hors ligne »            |
| Curseur dans la transaction                       | Node : exception après 300 lignes appliquées → curseur inchangé                                        |
| Pagination par clé composée + recouvrement        | FakeServer : 800 lignes au même instant, pages de 500 → toutes tirées ; commit tardif sous le curseur → récupéré |
| Ids dérivés                                       | même occurrence / même habitude créées hors ligne sur deux clients → une ligne, zéro `failed`          |
| Lot 4xx isolé                                     | 50 lignes dont une invalide → 49 acquittées, 1 `failed` avec code                                      |
| Enfant avant parent                               | `23503` → réessai, convergence au cycle suivant                                                        |
| Horloge en avance d'une heure                     | trigger ramène à `now()` ; l'autre appareil n'est pas bloqué                                           |
| Média après upload                                | ligne `media` absente de l'outbox tant que `pending` ; `storage_path` jamais effacé par LWW            |
| Reprise TUS                                       | kill à 40 % d'une vidéo de 120 Mo → reprise sans réenvoi                                               |
| Purge / reset                                     | appareil revenu après 40 jours : rien ne ressuscite, curseur reset, message lisible                     |
| Canal privé                                       | instance locale : membre reçoit, autre couple ne reçoit pas, présence trackée, rejoin après JWT expiré |
| Changement de compte                              | outbox de A jamais poussée sous B                                                                       |
| Convergence                                       | deux téléphones, 100 écritures croisées, coupures aléatoires (proxy) → identiques 3/3                   |

**Protocole deux téléphones** (défini en Phase 5, réutilisé ensuite). Maestro ne pilote
**pas** d'iPhone physique (support officiel refusé en juin 2026) et, sans Mac (T11), il
n'y a pas de simulateur iOS. Le protocole est donc **asymétrique** :
`scripts/two-phones.sh` lance le flow Maestro sur l'**Android** physique (`--device`) et
affiche pas à pas la **check-list manuelle iOS** (`apps/mobile/maestro/MANUAL-IOS.md`)
que le testeur exécute sur l'iPhone ; les deux côtés se synchronisent par lignes-témoins
(chaque côté écrit un marqueur, l'autre l'attend via REST), et les délais sont mesurés
côté serveur (`server_updated_at` vs horodatage de réception journalisé par l'app). Avec
un Mac, le flow iOS tourne sur simulateur (qui reçoit les pushs APNs sandbox sur Apple
Silicon) ou sur l'iPhone via `maestro-ios-device` (dépendance communautaire, assumée).
Les coupures passent par un **proxy piloté** (toxiproxy) devant l'URL Supabase du profil
`preview` — un iPhone physique n'a pas de CLI réseau. Le `FakeServer` (mémoire) couvre le
chaos déterministe en CI avec une graine, y compris « commit retardé » et « purge ».
