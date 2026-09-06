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

Choix de détail :

- **Deux horodatages** : `updated_at` (client, arbitre) et `server_updated_at` (serveur,
  curseur monotone). Un seul horodatage ne peut pas faire les deux rôles.
- **Outbox à ligne complète** : fusion naturelle des modifications successives, upsert
  idempotent, pas de rejeu de patchs.
- **Suppression = upsert avec `deleted_at`** : la corbeille et la sync sont la même chose.
- **Broadcast from Database** plutôt que `postgres_changes` : un topic par couple, RLS,
  message au format « ligne » identique au pull, pas de limite de filtres par table.
- **Écho ignoré** par `updated_from = device_id`.

## Conséquences

- On écrit et on maintient ce moteur (Phase 5 = ~2 semaines). En échange : zéro
  dépendance stratégique, compréhension complète.
- Pas de résolution champ par champ : deux modifications simultanées du même objet
  hors ligne → une des deux est perdue (celle datée la plus tôt). Assumé et documenté
  dans l'UI (« Modifié par Mimi il y a 2 min » sur la fiche).
- La purge à 30 jours borne la mémoire des suppressions ; un appareil resté hors ligne
  plus longtemps refait un pull complet.
