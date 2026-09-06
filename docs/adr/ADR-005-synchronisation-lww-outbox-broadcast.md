# ADR-005 — Synchronisation : base locale + outbox, LWW à deux horodatages, Broadcast from Database

**Statut** : proposé · **Date** : 2026-09-06 · **Phases** : 4–5

## Contexte

Offline-first complet (lecture, création, modification, suppression, médias), temps réel
quand les deux sont connectés, « dernière modification gagnante » sans moteur de
conflits, corbeille avec restauration, historique court. Deux utilisateurs, quelques
appareils, quelques dizaines de milliers de lignes au maximum.

## Options

1. **PowerSync** — SQLite local synchronisé depuis Postgres via réplication logique
   + service PowerSync (cloud payant ou Open Edition à héberger). Très robuste, mais
   ajoute un service à opérer, des *sync rules* à maintenir, et un SDK SQLite dédié.
2. **WatermelonDB** — base locale JSI + protocole de sync à implémenter côté serveur
   (RPC pull/push). Mûr, mais orienté ORM maison, moins naturel avec Drizzle/Supabase,
   et un modèle observable propre à lui.
3. **Legend-State v3 + `syncedSupabase`** — très peu de code, persistance MMKV,
   `changesSince: 'last-sync'`, soft delete. Mais l'état vit en mémoire (pas de SQL
   local pour la recherche FTS, les agrégations de statistiques, les jointures), et on
   couple toute l'app à une bibliothèque d'état encore jeune.
4. **Moteur maison** : expo-sqlite + Drizzle, `outbox` locale, push/pull par curseur
   `server_updated_at`, arbitrage LWW par `updated_at` client (trigger serveur), temps
   réel par *Broadcast from Database* sur un canal privé par couple.

## Décision

Option 4. Le besoin est modeste et parfaitement délimité (LWW, deux personnes, tables
au même squelette) ; le code de synchronisation tient en quelques centaines de lignes
testables avec un faux serveur en mémoire, et **aucun service supplémentaire** n'est à
opérer. La base locale est une vraie base SQL : recherche FTS5, statistiques, corbeille
multi-tables, tout se fait en requêtes.

Choix de détail (version 2, après relecture contradictoire) :

- **Ordre total** `(updated_at, updated_from)` posé par le client, comparé à l'identique
  par le trigger serveur et par le client ; une écriture perdante n'est pas écrite du
  tout (`return null`), le push est un accusé de réception et est toujours suivi d'un
  pull. Le serveur ramène à `now()` toute horloge en avance de plus de 2 minutes.
- **Curseur** `(server_updated_at, id)` avec `clock_timestamp()` et une fenêtre de
  recouvrement de 60 s : `server_updated_at` n'est **pas** strictement monotone sous
  concurrence, le recouvrement l'absorbe, l'idempotence rend le rejeu gratuit. Curseur
  écrit dans la même transaction SQLite que la page appliquée.
- **Identifiants UUID v5** dérivés de la clé naturelle pour tout ce que les deux
  téléphones peuvent créer « en même temps » : deux créations concurrentes deviennent
  une seule ligne arbitrée par LWW.
- **Outbox sans fusion en place** : chaque écriture remplace l'entrée par une nouvelle
  (`seq` neuf), acquittée par `(row_id, seq)` ; une édition pendant un push en vol survit.
- **Suppression = upsert avec `deleted_at`** et cascade explicite (`deleted_via`).
- **Broadcast from Database** sur un canal **privé** par couple (policies sur
  `realtime.messages`), traité comme un **indice** : application optimiste + pull
  debounced ; pas de règle d'écho (un écho porte mon couple local → no-op).
- **Deux exceptions serveur** au LWW ligne entière, et seulement deux : `done` d'une
  habitude absorbant ; tour de proposition terminal immuable, `events.status` dérivé.
- **Un fichier SQLite par compte** : rien ne part sous une autre identité.

## Conséquences

- On écrit et on maintient ce moteur (Phase 5 = ~2 semaines). En échange : zéro
  dépendance stratégique, compréhension complète.
- Pas de résolution champ par champ : deux modifications simultanées du même objet
  hors ligne → une des deux est perdue (celle datée la plus tôt). Assumé et documenté
  dans l'UI (« Modifié par Mimi il y a 2 min » sur la fiche).
- La purge à 30 jours borne la mémoire des suppressions ; un appareil resté hors ligne
  plus longtemps refait un pull complet.
