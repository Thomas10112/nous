# ADR-002 — Monorepo, site web v1 gelé, logique partagée en paquets

**Statut** : proposé · **Date** : 2026-09-06 · **Phase** : 2

## Contexte

Le dépôt est une SPA Vite + React 18 + TypeScript (≈ 13 600 lignes, 2 commits). Le
téléphone devient la plateforme principale ; le site web doit continuer de fonctionner
pendant la transition (les deux personnes l'utilisent) ; le desktop pourra être supporté
plus tard. Le brief interdit de supprimer une architecture propre pour repartir de zéro.

## Décision

1. **Monorepo pnpm workspaces** :

   ```
   apps/
     web/        ← le site actuel, déplacé tel quel (git mv, historique conservé)
     mobile/     ← application Expo (React Native)
   packages/
     domain/     ← types, moteur de récurrence, moteur calendrier, recherche, dates : TS pur, 0 dépendance UI
     data/       ← repositories (interfaces + SQLite), moteur de sync, client Supabase, médias
     theme/      ← tokens (source de vérité TS ; tokens.css généré pour le web)
     icons/      ← chemins SVG (IconName + paths), consommés par web et mobile
   supabase/
     migrations/ functions/ scripts/ seed/
   docs/
   ```

2. **`apps/web` est gelé** : pas de nouvelle fonctionnalité, seulement des correctifs.
   Il continue de lire la table `items` ; les migrations serveur sont écrites pour ne
   jamais casser ce contrat (`select collection, data … where space = …`). Quand le
   mobile est en production, on décidera de son avenir (Expo web, ou réécriture des pages
   sur `packages/domain`).

3. **Ce qui migre du web vers les paquets** dès la Phase 2, sans changer son comportement :
   `src/lib/date.ts` (corrigé et testé) → `packages/domain/dates` ; `src/lib/utils.ts`
   (parties pures) → `packages/domain/utils` ; `src/lib/login.ts` → `packages/data/auth` ;
   chemins d'icônes de `Icon.tsx` → `packages/icons` ; `tokens.css` → `packages/theme`
   (avec génération de `tokens.css` pour ne rien changer visuellement au web).
   `apps/web` importe ensuite ces paquets : c'est le test de non-régression de
   l'extraction.

4. **Outillage commun** : TypeScript strict partout, ESLint (typescript-eslint,
   react-hooks, import/order), Prettier, Vitest pour `packages/*`, GitHub Actions
   (typecheck + lint + tests sur chaque PR), EAS Build pour `apps/mobile`.

## Alternatives écartées

- **Deux dépôts** : duplication des types et des règles métier, dérive garantie.
- **Réécrire le web dans le monorepo tout de suite** : hors périmètre ; le calendrier
  passe d'abord.
- **npm workspaces** : fonctionne. Le gain de pnpm est la vitesse et la déclaration
  stricte des dépendances. Pour l'outillage natif React Native, `.npmrc` racine
  `node-linker=hoisted` (recommandation de la doc monorepo Expo) ; l'unicité de `react`,
  `react-native`, `react-native-reanimated`, `react-native-worklets`,
  `react-native-nitro-modules` est garantie par `pnpm.overrides` et vérifiée par
  `expo doctor` en CI.

## Conséquences

- Un peu de plomberie initiale (Phase 2 ≈ 3 jours).
- La logique métier est testée en Node, sans simulateur, en secondes.
- Le web ne régresse pas ; on peut le vérifier à chaque PR (`pnpm --filter web build`).
