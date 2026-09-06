# 00 — Audit du projet Nous (Phase 0)

> Date : 2026-09-06 · Dépôt : `Thomas10112/nous`, branche `master` (2 commits) ·
> Méthode : lecture intégrale des fondations par l'architecte, puis six audits
> parallèles par sous-système (kit UI, pages d'entrée/réglages, pages CRUD, pages
> interactives, langage visuel CSS, couche de données) avec contre-lecture des dettes
> sévères par des réfutateurs indépendants. Chaque affirmation ci-dessous est ancrée à un
> `fichier:ligne` vérifiable sur `master`.

## 1. Stack actuelle

| Domaine        | Choix                                                                         |
| -------------- | ----------------------------------------------------------------------------- |
| Langage        | TypeScript 5.6, `strict: true`, aucun `any` explicite                          |
| UI             | React 18.3 + Vite 5, react-router-dom 6 (`HashRouter`), framer-motion 11       |
| Style          | CSS maison (tokens.css 202 l. · ui.css 1 011 l. · pages.css 979 l. · layout.css 359 l.), BEM allégé, aucune lib de composants |
| Données        | React context unique (`store.tsx`, 517 l.) tenant toute la base en mémoire ; adaptateur `local` (IndexedDB + BroadcastChannel) ou `cloud` (Supabase) |
| Serveur        | Supabase : **une table** `items(space, collection, id, data jsonb, updated_at, created_at)`, Realtime `postgres_changes`, Storage privé + URLs signées 4 h |
| Auth           | Supabase Auth par surnom → e-mail technique `@nous.local` ; RLS « tout utilisateur authentifié voit tout » |
| Carte          | Leaflet + tuiles CARTO + géocodage Nominatim direct                            |
| Outillage      | `tsc --noEmit` + `vite build`. **Aucun test, aucun lint, aucune CI.**           |
| Taille         | ≈ 13 600 lignes, 51 fichiers                                                   |

Projet Supabase existant : `nous` (région `eu-west-3`, Postgres 17), **en pause**
(`INACTIVE`) au moment de l'audit.

## 2. Architecture actuelle

```
main.tsx → HashRouter → StoreProvider → App (portes : session → erreur de chargement → onboarding → routes)
                                        └─ Layout (sidebar PC / topbar + tabbar mobile) → pages (lazy)
pages/*  → useCollection(name) → store.tsx → Adapter (local | cloud) → IndexedDB | Supabase
```

Les pages ne parlent jamais à IndexedDB ni à Supabase (sauf Réglages pour
import/migration). Chaque page suit un squelette identique : `editing | draft` +
`FormModal` + `useConfirm` + `useLightbox` + FAB. La v1 est un **site web soigné**,
pensé pour être ajouté à l'écran d'accueil, pas une application mobile.

## 3. Points forts (à préserver)

1. **Le contrat d'adaptateur** (`adapter.ts:40-62`) et le flux `ChangeEvent`
   (`upsert | delete | status | reload`) : l'UI ne connaît qu'une interface. C'est la
   bonne frontière, on la garde en esprit (elle devient des repositories + un moteur de sync).
2. **Les garde-fous contre la perte de données** : `loadError` distinct de « base
   vide » (`store.tsx:226-233`, `App.tsx:167-174`), refus d'écrire des valeurs par
   défaut par-dessus les vraies (`store.tsx:333-336`), aucune lecture sans session
   (`cloud.ts:197-200`), `signOut` scope `local` (`cloud.ts:88-95`).
3. **Le langage visuel** : tokens réellement centralisés (2 palettes × 2 schémas par
   attributs sur `<html>`), vocabulaire identifiable (Fraunces + Inter, pilules, cartes
   26 px, ombres aubergine, grain), springs et easings nommés et homogènes. Voir
   [05](05-design-system-mobile.md).
4. **Le vocabulaire émotionnel** de `Proposal.tsx` : machine d'états explicite, bouton
   fuyard (spring 700/22, esquives plafonnées puis évaporation 💨), vague de couleur
   1,8 s synchronisée avec la bascule de palette, leçons documentées sur
   `AnimatePresence` gelé en arrière-plan (`Proposal.tsx:322-326`). C'est la matrice de la
   bulle de proposition d'activité.
5. **L'ossature de geste** du Moodboard : machine d'états dans un `useRef`, handlers
   uniques sur le conteneur, pointer capture, projection écran→monde pure
   (`Moodboard.tsx:121-131`), écriture en deux temps (`patchLocal` pendant le geste,
   `update` au relâchement avec snapshot pour l'undo).
6. **`lib/date.ts`** : pur, testable, dates de jour ancrées à midi (`toDate`,
   `date.ts:10`) donc insensibles au fuseau ; `elapsedSince`, `nextAnniversary`,
   `countdown` sont les germes des moments importants et des comptes à rebours.
7. **Capsules** : machine d'états scellée / prête / ouverte, tri « prêtes devant »,
   bandeau « N capsules vous attendent » — exactement la sémantique « échéance atteinte,
   pas encore vue ».
8. **Icônes** : 55 glyphes, un `path` par icône, `currentColor`, trait 1.6 arrondi
   (`Icon.tsx`) : portables tels quels vers `react-native-svg`.
9. **Copy française** soignée, commentaires qui expliquent le *pourquoi*, TypeScript strict.

## 4. Dette technique (par gravité, confirmée dans le code)

### 4.1 Disqualifiant pour l'offline-first et le partage à deux

| # | Constat | Preuve | Conséquence pour le calendrier |
| - | ------- | ------ | ------------------------------ |
| D1 | **Écriture hors ligne perdue** : `writeItem` applique l'optimiste, attend `put()`, et sur échec fait `notify` + `reload` ; pas de file, pas de réessai, pas de cache persistant en mode cloud. | `store.tsx:246-258`, `cloud.ts:129-134` | Déplacer un événement dans le métro = perdu au retour du réseau. |
| D2 | **Aucun LWW** : upsert inconditionnel avec l'horloge de l'appareil, aucun trigger, aucune comparaison de `updatedAt` à l'application (`applyChange`) ni au `reload` (remplacement intégral). Document entier écrasé. | `cloud.ts:222-234`, `store.tsx:137-147`, `store.tsx:156-161` | A renomme, B ajoute une photo : la photo disparaît partout. |
| D3 | **Rechargement intégral** à chaque démarrage / retour en ligne / retour au premier plan / échec d'écriture ; pas d'index `updated_at`, pas de delta ; course entre le `reload` REST et le flux realtime. | `cloud.ts:129-134, 197-220` | Intenable en 4G avec des milliers d'occurrences, de messages, de médias. |
| D4 | **Deux identités non liées** : `me` = `Person.id` choisi librement par appareil (`localStorage nous.me`), `user` = uuid Supabase ; `authorId = meId` donc déclaratif et falsifiable ; `Person.login` jamais lu. | `store.tsx:92-101, 266, 363-371` | Propositions, présence « Mimi écrit… », réactions, push ciblés, RLS : tout exige un auteur fiable. |
| D5 | **RLS sans isolation** : `auth.uid() is not null` suffit pour tout lire/écrire/supprimer, données et photos ; `space` n'est qu'une variable du bundle ; aucune table de membres ; `signUp` probablement ouvert. | `auth.sql:37-42, 59-64` | Messages privés et photos exigent « membre du couple » vérifié en SQL. |
| D6 | **Suppression définitive**, aucune corbeille, aucun tombstone ; `deleteMedia` n'est appelé **par aucune page** : chaque suppression/retrait de photo/« Tout effacer » laisse des blobs orphelins. | `store.tsx:289-300`, `local.ts:68`, `cloud.ts:236-244`, grep `deleteMedia` | Corbeille et restauration impossibles sans `deleted_at` + purge différée. |

### 4.2 Bloquant pour un calendrier fiable

| # | Constat | Preuve | Conséquence |
| - | ------- | ------ | ----------- |
| D7 | `todayISO()` en **UTC** (`toISOString`) : « aujourd'hui » est hier entre minuit et 1 h/2 h ; date par défaut de tous les formulaires et de `DEFAULT_SETTINGS.startDate`. | `date.ts:14`, `types.ts:250` | Cocher une habitude à 00:30 créditerait la veille. |
| D8 | `daysBetween` en millisecondes : off-by-one au passage à l'heure d'été ; `totalDays` retarde d'un jour entre minuit et midi (ancrage 12:00) ; 29 février glisse au 1er mars silencieusement. | `date.ts:48, 86, 94-98` | « Encore N dodos » faux une partie du temps. |
| D9 | **Pas de modèle temps** : jour seul (`YYYY-MM-DD`), `datetime-local` naïf sans fuseau (`unlockAt`), aucune notion de créneau, de plage, de récurrence, de semaine ISO ; mois codés en dur. | `types.ts:156`, `Capsules.tsx:373-393`, `form.tsx:105-122` | Rien ne peut représenter un événement de 9 h 30 à 11 h ni une habitude « tous les 3 mercredis ». |
| D10 | **`settings/main` unique** réécrit en entier à chaque frappe (broadcast temps réel par caractère) ; thème et palette partagés : changer le thème sur mon téléphone le change chez l'autre ; `milestones` déclaré mais **aucune UI** ne le lit ni ne l'écrit. | `Settings.tsx:205-251`, `store.tsx:316-343, 398-432`, `types.ts:52` | Préférences par appareil (densité, animations) impossibles ; les moments importants n'ont pas de conteneur. |
| D11 | **Store monolithique** : données + session + thème + toasts + identité dans un contexte dont la valeur change à chaque écriture (`useMemo` à 25 dépendances) ; `patchLocal` à chaque `pointermove` recrée toute la collection ; le store importe un composant UI et manipule le DOM. | `store.tsx:33, 302-312, 398-432, 434-468` | Une grille + présence + messagerie dans ce contexte jankera au drag. |
| D12 | **Aucun test, aucun lint** ; `eslint-disable` mort ; casts `as unknown as DB` ×5, frontière réseau/import non validée, pas de version de schéma des items. | `package.json`, `adapter.ts:73`, `store.tsx:139-306`, `Settings.tsx:88-89` | LWW, récurrence, DST : zones où l'on ne survit pas sans tests. |

### 4.3 Kit UI et mobile-readiness

| # | Constat | Preuve |
| - | ------- | ------ |
| D13 | **Pseudo bottom-sheet** : modale ancrée en bas par CSS, poignée décorative, pas de drag-to-dismiss, pas de détentes, pas de gestion du clavier (`visualViewport` absent), verrou `body.overflow` inefficace sur iOS, fermeture sur `mousedown` du fond sans garde « non enregistré ». | `Modal.tsx:17-58`, `ui.css:561-653` |
| D14 | **Aucun time picker / durée / plage / récurrence** ; `DateInput` = `<input type=date|datetime-local>` brut. | `form.tsx:105-122` |
| D15 | **Cibles tactiles < 44 pt** presque partout (chip 26, `card__action` 32, `btn--sm` 32, segmented 32, `photos__remove` 24, étoiles ≈ 18) ; `:hover` non gardé par `(hover:hover)` → états collés après un tap ; inputs 15 px → zoom iOS au focus. | `ui.css:16-472` |
| D16 | **`prefers-reduced-motion` ignoré par framer-motion** (aucun `useReducedMotion` / `MotionConfig`) ; 14 cœurs en boucle infinie dans Proposal. | `global.css:252`, grep vide |
| D17 | `Segmented` : `layoutId` **global** « segmented-pill » → deux segmentés sur une page partagent la pastille. | `primitives.tsx:166` |
| D18 | **Pipeline média photo-only** : `pickFiles` détecte l'annulation par `window focus + 400 ms` (fragile sur iOS), pas de vidéo, pas de capture, pas de vignettes (grilles de 88 px chargent l'image 1 920 px), pas de file d'envoi hors ligne, `createSignedUrl` par photo sans lot, Lightbox sans pinch/dismiss/vidéo. | `media.ts:58-74`, `Img.tsx:90-207, 343-349` |
| D19 | Polices via Google Fonts (dépendance réseau, axes `SOFT/WONK` non demandés donc **inertes**) ; pas de manifest ni de service worker ; grain `feTurbulence` en `position: fixed` z-index 9999 ; `backdrop-filter` ×11 ; `color-mix` ×7 ; pas de token `danger` (4 rouges en dur), ni densité, ni z-index, ni taille de cible. | `index.html:15`, `global.css:30-51`, `tokens.css` |

### 4.4 Duplication et taille

- 8 pages réimplémentent le même squelette CRUD (60–80 lignes identiques chacune) ;
  trois d'entre elles réécrivent `CardActions` inline (`Words.tsx:158`, `Bucket.tsx:224`,
  `Awards.tsx:137`). Filtre/tri/recherche recomposés à la main avec des champs ad hoc
  (Gallery ignore `tags`, Awards n'a pas de recherche). Groupement par période fondé sur
  des libellés affichés (`Gallery.tsx:125-135`).
- Composants monolithiques : `Moodboard.tsx` 1 066 l., `Settings.tsx` 566 l.,
  `MapPage.tsx` 486 l., `Capsules.tsx` 422 l., `Img.tsx` 430 l.
- Palettes de couleurs dupliquées en TSX sans lien avec les tokens (Moodboard 16 hex,
  Onboarding 6 hex, MapPage, `DEFAULT_SETTINGS`, `readableOn`).
- Home et Galerie ont deux définitions différentes de « toutes les photos »
  (`Home.tsx:47-72` vs `Gallery.tsx:52-113`).
- Prénom codé en dur dans la demande (« Oui Andrieu », `Proposal.tsx:212`).

## 5. Ce qui est réutilisable, et comment

| Élément | Portabilité vers React Native | Devient |
| ------- | ----------------------------- | ------- |
| Chemins SVG des 55 icônes (`Icon.tsx:15-70`) | **tel quel** | `packages/icons` (+ ≈ 30 glyphes) |
| Tokens (`tokens.css`) | **tel quel** (valeurs) | `packages/theme/tokens.ts`, `tokens.css` généré |
| `lib/date.ts` formats FR, `elapsedSince`, `nextAnniversary`, `countdown` | logique, à corriger (D7, D8) sous tests | `packages/domain/dates` |
| `lib/utils.ts` (`normalize`, `matches`, `sortBy`, `uniq`, `debounce`, `clamp`, `readableOn`, `initials`) | **tel quel** sauf `downloadJSON` | `packages/domain/utils` |
| `lib/login.ts` (surnom → e-mail) | tel quel, config injectée | `packages/data/auth` |
| Contrats de props (`Button`, `Chip`, `Segmented<T>`, `FormModal`, `useConfirm`, `Toasts`) | logique / API | `apps/mobile/src/ui` (réécriture du rendu) |
| Machine d'états de geste + projection pure + écriture en deux temps (Moodboard) | logique | moteur de drag de la grille |
| Vocabulaire d'animation de `Proposal` (timings, springs, séquence) | valeurs | `ProposalBubble`, `useMotion()` |
| Machine d'états capsule, `.upnext`, `CounterCell` | logique / visuel | `CountdownCard`, widget |
| `groupIntoDB`, pagination, traduction des erreurs Supabase, garde `service_role`, cache d'URLs signées | logique | `packages/data` |
| Paramètres de compression (1 920 px, q0.84, seuil 220 Ko) | valeurs | `MediaPipeline` natif |
| Schéma SQL `items` + REPLICA IDENTITY FULL + bucket privé | tel quel, étendu | `supabase/migrations/0001` (table conservée pour le web) |
| Modèle `Place {name, lat, lng, country}` + geocoder Nominatim debounced | logique (ajouter annulation, cache) | sous-type `Location` + `useGeocode` |

## 6. Ce qui doit être refait

- Le **store en mémoire + reload intégral** → base locale SQLite + sync incrémentale (04).
- `notify + reload` sur échec → **outbox** persistante.
- Suppression physique → **`deleted_at`** + corbeille + purge.
- Identité `localStorage` → **compte = personne** (`profiles`).
- Policies `auth.uid() is not null` → **isolation par couple** en SQL.
- `date.ts` comme socle → module « jour civil » + « instant » avec fuseau, testé sur DST.
- Tout le rendu (CSS, framer-motion, portails, inputs HTML) → design system mobile (05).
- Pipeline média → picker natif, compression native, vignettes, vidéo, file d'envoi.

## 7. Incompatibilités avec une vraie application mobile

Tout ce qui suit n'existe pas en React Native et est utilisé aujourd'hui : DOM/`window`/
`document` (portails, `keydown`, `overflow`), IndexedDB, BroadcastChannel, `localStorage`,
`URL.createObjectURL`, `File`/`DragEvent`/`ClipboardEvent`, `canvas`/`createImageBitmap`,
`<input type=file|date|datetime-local|color|range>`, `import.meta.env`, `HashRouter`,
framer-motion, toute la CSS (`backdrop-filter`, `color-mix`, `feTurbulence`,
`font-variation-settings`, `position: sticky/fixed`, grid/multi-colonnes, dégradés
radiaux, `:hover`, transitions de palette), Leaflet, polices CDN, `navigator.storage`,
`location.reload()`. Voir [01 — Stack](01-stack.md) pour ce que ça implique.

## 8. Conclusion de l'audit

La v1 a **une bonne colonne vertébrale** (adaptateur, tokens, ton, garde-fous) et une
**mauvaise base pour le partage à deux hors ligne** (D1–D6). Le calendrier ne peut pas
être posé dessus : il faut d'abord une couche de données locale-d'abord et une identité
fiable, puis un design system mobile qui reprend l'identité visuelle sans le CSS. Rien
de propre n'est jeté : le web reste en service (ADR-002), et ce qui est logique pure
migre dans des paquets partagés, sous tests.
