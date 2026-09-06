# 08 — Mesures de la Phase 1 (données réelles)

> Relevé du 6 septembre 2026 sur le projet Supabase `nous` (`owdvunobbzfvlafoypvh`,
> eu-west-3, Postgres 17), **restauré ce jour** après sa mise en pause (organisation sur
> le plan gratuit). Ces chiffres dimensionnent la migration (Phase 3) et le plan
> Supabase (T9).

## 1. Volumes : négligeables

| Collection   | Lignes | Taille `data` | Première ligne | Dernière modification |
| ------------ | -----: | ------------: | -------------- | --------------------- |
| `settings`   | 1      | 1,2 Ko        | 15/08/2026     | 15/08/2026            |
| `adventures` | 1      | 0,5 Ko        | 15/08/2026     | 15/08/2026            |
| `words`      | 3      | 1,2 Ko        | 15/08/2026     | 21/08/2026            |
| `bucket`     | 5      | 1,5 Ko        | 18/08/2026     | 29/08/2026            |
| **Total**    | **10** | **≈ 4,4 Ko**  |                |                       |

Storage (bucket `media`, privé) : **2 objets, 435 Ko**, le plus gros 351 Ko, aucun
au-dessus de 50 Mo. Références `cloud:` dans `items.data` : 2 (une dans `adventures`,
une dans `settings.coverPhoto`), toutes résolues ; **0 orphelin, 0 référence pendante,
0 référence `local:`**.

Conséquences :

- l'étape `media-legacy` de `migrate-v1.ts` porte sur deux fichiers : elle reste
  écrite (idempotente) mais n'est pas un risque ;
- le plan gratuit suffit largement tant qu'il n'y a pas de vidéos ; la limite de
  **50 Mo par fichier** reste la contrainte structurante (Q6, T9) ;
- le mode réellement utilisé par le couple est bien le **mode partagé** (comptes,
  policies et bucket privé en place).

## 2. Comptes et identité (T8)

| Compte (`auth.users`)  | `id`                                   | Créé le    | Dernière connexion |
| ---------------------- | -------------------------------------- | ---------- | ------------------ |
| `moncoeur@nous.local`  | `8d1e917f-c66e-44df-bdca-4ad25834b74a` | 15/08/2026 | 15/08/2026         |
| `mimi@nous.local`      | `c95c9aac-e17f-4fff-91b2-4b8abeefd6b7` | 15/08/2026 | 25/08/2026         |

`settings.people` : `p1` = « mimi » (`#c19a45`), `p2` = « mimine » (`#6f8bab`).
`settings.setupBy` = `c95c9aac…` (le compte `mimi@nous.local` a configuré le site) ;
`proposal` = répondue le 15/08/2026 après 2 refus, palette repeinte acceptée.

**Mapping proposé pour l'étape `identity`** (à confirmer, T8) :
`--map p1=c95c9aac-e17f-4fff-91b2-4b8abeefd6b7 --map p2=8d1e917f-c66e-44df-bdca-4ad25834b74a`.

## 3. Réglages partagés relevés

| Clé          | Valeur        | Conséquence                                                                 |
| ------------ | ------------- | --------------------------------------------------------------------------- |
| `startDate`  | `2026-07-08`  | Devient le moment `anniversary` (`origin_date`) à l'étape `moments`.         |
| `palette`    | **`bleu`**    | Le couple vit dans la palette bleue : maquettes et spike doivent la montrer. |
| `theme`      | `auto`        | Devient une préférence par appareil (Q19).                                   |
| `milestones` | `[]`          | Rien à migrer.                                                               |
| `rating`     | `0` (1 ligne) | Échelle non déterminable sur les données ; l'UI note /5, le type dit /10 : à trancher au portage des aventures (hors roadmap). |

## 4. Sécurité et extensions

- RLS actif sur `items` avec la policy `membres : tout` (`auth.uid() is not null`) ;
  Storage : policy `media : membres`, bucket **privé** → `auth.sql` a bien été appliqué.
  L'isolation par couple (D5) reste à faire en Phase 3 (`0001_identity.sql`, `0010`).
- Avis de sécurité Supabase : un seul avertissement, **protection contre les mots de
  passe compromis désactivée** (à activer dans Authentication → Settings, Phase 19).
- Extensions disponibles mais non installées : `pg_cron` 1.6.4, `pgtap` 1.3.3, `pg_net`,
  `pgmq`, `pg_trgm`, `unaccent` — tout ce dont les phases 3 et 8 ont besoin.
- Réglage « Max rows » de l'API : à lire dans le tableau de bord (non accessible en SQL) ;
  sans importance tant que les tables restent sous 1 000 lignes, à vérifier avant la
  Phase 5.

## 5. Ce qui reste à faire en Phase 1 et qui dépend du couple

| Item | État |
| ---- | ---- |
| Projet Supabase restauré | ✅ fait le 06/09/2026 (`ACTIVE_HEALTHY`) — le `keep-alive` de la Phase 2 évitera une nouvelle pause |
| Compte Apple Developer (T2) | à ouvrir |
| Mac disponible ? (T11) | à répondre |
| Modèles et OS des deux téléphones (T10) | à fournir |
| Spike de la vue Semaine | code prêt dans `spike/week-grid/` (typecheck vert) ; **build EAS et verdict sur les deux téléphones** à faire par le couple ([README](../spike/week-grid/README.md)) |
| Mapping des comptes (§2) | à confirmer |
