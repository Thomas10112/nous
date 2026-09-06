# 05 — Design system mobile

> Statut : **proposition à valider** (Phase 6). Objectif : que le calendrier ait l'air
> d'avoir toujours fait partie de Nous. Rien ici n'invente une identité ; tout est
> extrait de `tokens.css`, `ui.css`, `pages.css`, `proposal.css` et des pages actuelles.

## 1. Ce que Nous « est », visuellement

- **Chaud, papier, doux.** Fond crème `#faf6f2` avec un **grain** très léger (3,5 %),
  surfaces blanches empilées (`surface` → `surface-2` → `surface-3`), lignes à 10 %
  d'opacité, ombres teintées brun jamais noires.
- **Deux voix typographiques.** *Fraunces* (serif à axes `SOFT 40 / WONK 1`, graisse 500,
  interlettrage −0,015 em) pour ce qui compte : titres, prénoms, chiffres des compteurs,
  citations. *Inter* pour l'interface. Les nombres sont toujours en `tabular-nums`.
- **Une couleur pour la relation.** L'accent terracotta rosé `#c4736e` (palette
  « automne ») ou bleu `#5f97c6` (palette « bleu », choisie lors de « la demande »). Les
  autres couleurs sont **sémantiques** et rares : `gold` = prêt / célébration / bientôt,
  `sage` = fait / synchronisé, `plum` = scellé / en attente, `sky` = information.
- **Formes.** Pilules pour tout ce qui se touche (boutons, chips, segmenté, toasts) ;
  cartes en `r-lg` 26 px ; champs en `r-sm` 12 px ; héros en `r-xl` 36 px.
- **Mouvement.** Entrées en `opacity 0 → 1` + `y 14 → 0`, easing maison
  `cubic-bezier(0.32, 0.72, 0, 1)`, durées 140 / 240 / 460 ms ; springs « fermes »
  (stiffness 380–420, damping 32–36) pour les pastilles et sheets, spring « vif »
  (700 / 22) pour le bouton fuyard, spring « moelleux » (220–260 / 16–18) pour un cœur
  qui apparaît. Un stagger de `min(i × 50 ms, 300 ms)` sur les listes.
- **Ton.** Vouvoiement pluriel, phrases courtes, un émoji au plus (🤍), pluriels accordés.

## 2. Tokens → `packages/theme`

Source de vérité : `packages/theme/src/tokens.ts` (objet TypeScript). `tokens.css` du
web devient **généré** à partir de lui (script `pnpm theme:css`), pour que le site v1 ne
change pas d'un pixel.

### 2.1 Couleurs (palette « automne »)

| Token          | Clair                     | Sombre                    | Usage                                  |
| -------------- | ------------------------- | ------------------------- | -------------------------------------- |
| `bg`           | `#faf6f2`                 | `#16110f`                 | Fond d'écran                           |
| `bgTint`       | `#f3eae3`                 | `#1e1715`                 | Barre latérale, zones secondaires      |
| `surface`      | `#ffffff`                 | `#211a18`                 | Cartes                                 |
| `surface2`     | `#fbf6f3`                 | `#26201d`                 | Pied de sheet, cellules                |
| `surface3`     | `#f4ece7`                 | `#2f2724`                 | Fonds de champs, pastilles             |
| `overlay`      | `rgba(46,34,38,.32)`      | `rgba(8,5,6,.6)`          | Fond de sheet                          |
| `ink`          | `#2e2226`                 | `#f3e9e6`                 | Texte                                  |
| `ink2`         | `#6b5a60`                 | `#bfaba5`                 | Texte secondaire                       |
| `ink3`         | `#9c8b90`                 | `#8b7973`                 | Métadonnées, dates                     |
| `inkOnAccent`  | `#ffffff`                 | `#241413`                 | Texte sur accent                       |
| `line`         | `rgba(58,38,44,.10)`      | `rgba(255,236,230,.10)`   | Bordures                               |
| `lineStrong`   | `rgba(58,38,44,.18)`      | `rgba(255,236,230,.20)`   | Bordures actives                       |
| `accent`       | `#c4736e`                 | `#e0968e`                 | La relation, l'action principale       |
| `accentHover`  | `#b1615d`                 | `#eaa79f`                 |                                        |
| `accentSoft`   | `#f6e3e0`                 | `#3a2523`                 | Fonds accentués                        |
| `accentRing`   | `rgba(196,115,110,.28)`   | `rgba(224,150,142,.30)`   | Halo, focus                            |
| `gold` / `goldSoft` | `#c19a45` / `#f6ecd6` | `#dcb765` / `#372d1a`   | Prêt, célébration, compte à rebours    |
| `sage` / `sageSoft` | `#7c9a81` / `#e4eee5` | `#9dbba2` / `#22301f`   | Fait, synchronisé, accepté             |
| `plum` / `plumSoft` | `#7d5f77` / `#efe4ed` | `#bb96b3` / `#2f2130`   | En attente, proposé, scellé            |
| `sky` / `skySoft`   | `#6f8bab` / `#e3ebf3` | `#96b0cd` / `#1e2833`   | Information, événement perso de l'autre|
| `danger`       | `#b4433f`                 | `#e88b86`                 | Refus, suppression                     |

La palette « bleu » remplace les mêmes clés (valeurs déjà dans `tokens.css`). Chaque
personne garde sa **couleur d'avatar** (`profiles.color`) qui teinte ses événements
personnels.

### 2.2 Échelles

| Famille   | Tokens                                                                       |
| --------- | ---------------------------------------------------------------------------- |
| Typo      | `xs 12 · sm 13 · base 15 · md 17 · lg 22 · xl 30 · 2xl 40 · 3xl 56` (px)     |
| Rayons    | `xs 8 · sm 12 · md 18 · lg 26 · xl 36 · full 999`                            |
| Espaces   | `1:4 · 2:8 · 3:12 · 4:16 · 5:24 · 6:32 · 7:48 · 8:64`                        |
| Durées    | `fast 140 · base 240 · slow 460` ms                                          |
| Easing    | `ease [0.32,0.72,0,1]` · `easeSoft [0.4,0,0.2,1]`                            |
| Springs   | `firm {380,32}` · `pill {420,36}` · `soft {240,17}` · `lively {700,22}`      |
| Ombres    | `sm / md / lg` teintées (`rgba(64,40,46,…)` clair, noires en sombre)         |

### 2.3 Nouveaux tokens (absents du web, nécessaires au mobile)

| Token                 | Valeur                       | Pourquoi                                                                 |
| --------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| `hit.min`             | 44                           | Cible tactile minimale (iOS HIG / Material). Le web est à 26–40 px.       |
| `density`             | `compact / normal / airy`    | Axe de personnalisation : multiplie espaces et hauteurs de ligne (0.85 / 1 / 1.15). |
| `slot.height`         | 22 / 28 / 36 selon densité   | Hauteur d'un créneau de 30 min dans la grille (zoomable par pinch).       |
| `motion.level`        | `full / reduced / off`       | Système (`AccessibilityInfo.isReduceMotionEnabled`) ⊕ réglage utilisateur. |
| `grain.opacity`       | 0.035 / 0.05                 | Tuile PNG 160 px répétée en overlay non interactif (le SVG `feTurbulence` n'existe pas en natif). |
| `safeArea.*`          | insets                       | Via `react-native-safe-area-context`.                                    |
| `danger` / `dangerSoft` | `#b4433f` / `#f6e1df` (sombre `#e88b86` / `#3a2323`) | Le web a quatre rouges en dur (`ui.css:79-88`, `layout.css:156`) ; un seul token, décliné par palette et schéma. |
| `onMedia` / `scrim`   | `#ffffff` / `rgba(20,12,14,.62)` | Texte et voiles sur photo (héros, vignettes). Aujourd'hui en dur dans `pages.css`. |
| `paper`               | `#fffdfb` (sombre `#2a2320`) | Fond « papier » des post-it/polaroids et des souvenirs.                  |
| `glass.bg86` / `glass.surface92` | rgba pré-calculées   | Remplacent `color-mix(...)` (7 usages) pour les barres translucides.      |
| `z.*`                 | `base 0 · sticky 10 · sheet 20 · overlay 30 · toast 40 · bubble 50` | Le web a 14 valeurs éparses de 5 à 9999.                      |
| `icon.*`              | `xs 15 · sm 17 · md 20 · lg 24 · xl 28`        | Le web en a neuf en dur dans les TSX.                                    |
| `tabbar.height`       | 56 + safe-area               | Trois « magic numbers » différents sur le web (60/64/70) pour la même réservation. |

## 3. Composants mobiles (`apps/mobile/src/ui`)

Le kit web ne se porte pas (DOM, CSS, framer-motion). On **réécrit** en gardant les
**contrats de props** existants pour que le vocabulaire reste le même d'une plateforme à
l'autre.

| Composant            | Hérite de (web)                       | Notes mobile                                                                                      |
| -------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `Text`               | classes `.serif/.eyebrow/.muted/.dim` | Variantes `display / title / body / meta / eyebrow`, `tabular` pour les nombres.                  |
| `Button`             | `Button` (variant, size, icon, block) | Hauteur ≥ 44, `loading`, haptique légère sur `primary`.                                           |
| `Card`               | `Card` (pad, hover→pressable, flat)   | `Pressable` avec `scale 0.98` au toucher.                                                         |
| `Chip`               | `Chip` (tone, outline, active)        | Hauteur 32 avec `hitSlop` jusqu'à 44.                                                             |
| `Segmented`          | `Segmented<T>`                        | Pastille Reanimated (`layout` par instance : corrige le bug de `layoutId` global du web).         |
| `Sheet`              | `Modal` ancrée en bas                 | Vrai bottom sheet : détentes (aperçu ≈ 45 %, édition ≈ 92 %), drag-to-dismiss, clavier géré, garde « modifications non enregistrées ». ADR-008. |
| `FormSheet`          | `FormModal`                           | Même API : `onSubmit`, `canSubmit`, `onDelete`, `submitLabel`, verrou anti double-envoi.          |
| `useConfirm`         | `useConfirm`                          | Identique (promesse booléenne), rendu en `Sheet` courte.                                          |
| `Toast`              | `Toasts`                              | + action optionnelle (« Annuler », « Voir »), file, accessibilité `liveRegion`.                   |
| `Field / Input / Textarea / Switch` | `form.tsx`             | `TextInput` natif, `enterKeyHint`, erreurs inline, auto-grow.                                     |
| `DateField / TimeField / DurationField` | — (n'existent pas) | Pickers natifs (`@react-native-community/datetimepicker`), pas de 30 min, « toute la journée », plage multi-jours. |
| `RecurrenceField`    | —                                     | « Tous les [n] [unité] » + « Personnaliser davantage ».                                           |
| `PersonPicker`       | `PersonPicker`                        | Tri-état : moi / l'autre / à deux.                                                                |
| `Avatar`             | `Avatar`                              | + anneau de présence (en ligne / actif / hors ligne).                                             |
| `Icon`               | `Icon`                                | `react-native-svg`, **mêmes chemins** (`packages/icons`), + ~30 glyphes (clock, bell, repeat, chat, send, more, history, chart, video…). |
| `Img`                | `Img / useMediaURL`                   | `expo-image` (cache disque, transition 240 ms, blurhash local), tailles `thumb / medium / full`.  |
| `Lightbox`           | `Lightbox`                            | Pan / pinch / double-tap / swipe-down, vidéo (`expo-video`).                                      |
| `Empty`, `Stat`, `Progress`, `Divider`, `PageHeader` | idem  | Réécriture directe.                                                                               |
| `Grain`              | `body::before`                        | Overlay PNG, `pointerEvents="none"`, désactivé si `motion.level = off` sur appareil lent.         |
| `PresenceBadge`, `QuickMessageButton`, `ActivityBubble` | — | Nouveaux, Phase 14.                                                                               |

## 4. Composants propres au calendrier (`apps/mobile/src/features/calendar/ui`)

- **`TimeGrid`** : 48 lignes de `slot.height`, heures en `meta`, ligne « maintenant » en
  accent avec un petit cœur, colonne(s) de jour(s).
- **`EventBlock`** : carte `r-sm`, bord gauche 3 px de la couleur (personne ou catégorie),
  titre `body` 600, méta `meta` ; états : `proposed` (pointillés + `plumSoft`),
  `accepted` (`accentSoft` + petit cœur), `declined` (n'est pas rendu), `conflict`
  (liseré `gold`), `dragging` (ombre `lg`, scale 1.02, haptique au snap).
- **`AllDayBand`** : bandes `r-full` sur une ou plusieurs colonnes ; « sans heure » avec
  badge horloge.
- **`HabitPill`** : pilule cochable (`sage` quand faite), long-press = « Rattraper ».
- **`MemoryStamp`** : vignette photo 40 px avec coin replié, dans la cellule du jour.
- **`MomentStar`** : étoile `gold` à 6 branches qui pulse doucement (`soft`), reliée aux
  autres par un trait fin dans la vue Année (constellation).
- **`ProposalBubble`** : bulle `r-xl` sur fond dégradé `accentSoft → goldSoft` (comme
  `.upnext`), photo optionnelle, trois actions : **Oui** (primary, spring `soft` + pluie
  de cœurs 1,1 s), **Plutôt…** (ouvre la contre-proposition dans la même bulle),
  **Non** (la bulle recule, tremble `[-2.5°, 2.5°]` puis file hors écran avec `💨`,
  spring `lively`). Voir Proposal.tsx pour le vocabulaire d'origine.
- **`CountdownCard`** : gros nombre Fraunces `xl` accent, « dodos » en `eyebrow`,
  dégradé `accentSoft → goldSoft` ; devient `gold` plein le jour J avec « C'est aujourd'hui 🤍 ».
- **`MonthCell`**, **`YearTile`**, **`DayPager`** (3 pages recyclées), **`ViewSwitch`**
  (Segmented Jour / Semaine / Mois / Année).

## 5. Mouvement : règles

1. Chaque animation a une fonction : montrer d'où vient un élément, confirmer un geste,
   attirer l'œil sur ce qui a changé. Aucune décoration en boucle hors le cœur de
   chargement et l'étoile de moment (< 1 % d'amplitude).
2. `motion.level` est lu par un hook `useMotion()` qui renvoie les springs/durées
   effectifs ; en `reduced`, les déplacements deviennent des fondus, en `off` tout est
   instantané. **Toutes** les animations passent par ce hook (le web ne le faisait pas).
3. Les gestes tournent sur le thread UI (Reanimated worklets + Gesture Handler) ; le JS
   n'est prévenu qu'au relâchement.
4. Retours haptiques (`expo-haptics`) : `selection` au snap d'un créneau, `light` à la
   pose, `success` à l'acceptation d'une proposition, `warning` au refus. Désactivables.
5. Transitions d'écran : celles de la pile native (Expo Router), pas de fondu maison.

## 6. Ce qui ne se traduit pas et ce qu'on fait

| Web                              | Mobile                                                       |
| -------------------------------- | ------------------------------------------------------------ |
| `backdrop-filter: blur()`        | `expo-blur` (BlurView) pour la tabbar et le fond des sheets   |
| grain `feTurbulence` SVG         | tuile PNG 160 px, opacité `grain.opacity`                    |
| `color-mix()`                    | valeurs pré-calculées dans `tokens.ts`                       |
| `font-variation-settings`        | instances statiques de Fraunces embarquées (`expo-font`)     |
| `clamp()` / `vw`                 | `useWindowDimensions()` + échelle typographique fixe         |
| transitions de palette 1,3 s     | interpolation des couleurs par Reanimated sur le thème racine |
| `:hover`                         | n'existe pas ; `pressed` seulement                            |

## 7. Livrables de la Phase 6

- `packages/theme` (tokens, `createTheme(palette, scheme, density)`, générateur CSS,
  tests de contraste AA sur les paires texte/fond).
- `packages/icons` (paths + liste, script de vérification « une icône = un path »).
- `apps/mobile/src/ui/*` avec une **galerie de composants** (écran `/dev/ui` en build
  de développement) pour comparer côte à côte avec le web.
- Polices embarquées, splash et icône d'app dans l'esprit (cœur plein sur crème).
