# 05 — Design system mobile

> Statut : **proposition à valider** (Phase 6), **version 2** après relecture. Objectif :
> que le calendrier ait l'air d'avoir toujours fait partie de Nous. Les tokens sont
> extraits de `tokens.css`, `ui.css`, `pages.css`, `proposal.css` ; ce que le tactile
> exige en plus est nommé comme tel.

## 1. Ce que Nous « est », visuellement

- **Chaud, papier, doux.** Fond crème `#faf6f2` avec un **grain** très léger, surfaces
  blanches empilées (`surface` → `surface2` → `surface3`), lignes à 10 %, ombres teintées
  brun jamais noires.
- **Deux voix typographiques.** *Fraunces* (serif, 500, −0,015 em) pour ce qui compte :
  titres, prénoms, chiffres des compteurs, citations. *Inter* pour l'interface. Nombres
  en `tabular-nums`.
- **Une couleur pour la relation.** L'accent terracotta `#c4736e` (« automne ») ou bleu
  `#5f97c6` (« bleu », choisi lors de « la demande »). Les autres couleurs sont
  **sémantiques et rares** : `gold` = prêt / célébration / bientôt, `sage` = fait /
  synchronisé, `plum` = proposé / en attente, `sky` = information, `danger` = refus / corbeille.
- **Formes.** Pilules pour tout ce qui se touche ; cartes `r-lg` 26 px ; champs `r-sm`
  12 px ; héros `r-xl` 36 px.
- **Mouvement.** Entrées `opacity 0 → 1` + `y 14 → 0`, easing `cubic-bezier(0.32, 0.72, 0, 1)`,
  durées 140 / 240 / 460 ms ; springs « fermes » (380–420 / 32–36), « vif » (700 / 22,
  la bulle qui s'enfuit), « moelleux » (220–260 / 16–18). Stagger 15–50 ms par élément
  selon la page, plafonné à 240–300 ms.
- **Ton.** Vouvoiement pluriel, phrases courtes, un émoji au plus (🤍), pluriels accordés.

## 2. Tokens → `packages/theme`

Source de vérité : `packages/theme/src/tokens.ts`. Le `tokens.css` du web est généré ; un
test parse l'ancien et le nouveau (postcss) et compare les cartes de propriétés pour
chaque palette × schéma — égalité stricte des valeurs (le fichier peut être reformaté ;
`--sidebar-w`/`--header-h` restent dans une feuille web `layout-tokens.css`).

### 2.1 Couleurs (palette « automne »)

| Token          | Clair                   | Sombre                  | Usage                                  |
| -------------- | ----------------------- | ----------------------- | -------------------------------------- |
| `bg` / `bgTint` | `#faf6f2` / `#f3eae3`  | `#16110f` / `#1e1715`   | Fond d'écran / zones                   |
| `surface` / `surface2` / `surface3` | `#ffffff` / `#fbf6f3` / `#f4ece7` | `#211a18` / `#26201d` / `#2f2724` | Cartes / cellules / champs |
| `paper`        | `#fffdfb`               | `#2a2320`               | Cartes d'événement, post-it, souvenirs |
| `overlay`      | `rgba(46,34,38,.32)`    | `rgba(8,5,6,.6)`        | Fond de sheet                          |
| `ink` / `ink2` / `ink3` | `#2e2226` / `#6b5a60` / `#9c8b90` | `#f3e9e6` / `#bfaba5` / `#8b7973` | Texte / secondaire / **non textuel ou ≥ 17 px seulement** |
| `inkOnAccent`  | `#ffffff`               | `#241413`               | Texte sur bouton `primary` (≥ 15 px 600) |
| `line` / `lineStrong` | `rgba(58,38,44,.10)` / `.18` | `rgba(255,236,230,.10)` / `.20` | Bordures                   |
| `accent` / `accentHover` / `accentSoft` / `accentRing` | `#c4736e` / `#b1615d` / `#f6e3e0` / `rgba(196,115,110,.28)` | `#e0968e` / `#eaa79f` / `#3a2523` / `rgba(224,150,142,.30)` | La relation (surfaces, icônes, marques) |
| **`accentInk`** | `#9a4f48`              | `#eaa79f`               | **Texte** sur `accentSoft` et fonds doux |
| `gold` / `goldSoft` / **`goldInk`** | `#c19a45` / `#f6ecd6` / `#7f6120` | `#dcb765` / `#372d1a` / `#e8c97a` | Bientôt, fête |
| `sage` / `sageSoft` / **`sageInk`** | `#7c9a81` / `#e4eee5` / `#4e6b53` | `#9dbba2` / `#22301f` / `#b7d1bb` | Fait, accepté |
| `plum` / `plumSoft` / **`plumInk`** | `#7d5f77` / `#efe4ed` / `#5c4157` | `#bb96b3` / `#2f2130` / `#d1b3ca` | Proposé, en attente |
| `sky` / `skySoft` / **`skyInk`** | `#6f8bab` / `#e3ebf3` / `#4a6483` | `#96b0cd` / `#1e2833` / `#b3c8de` | Information, perso de l'autre |
| `danger` / `dangerSoft` / **`dangerInk`** | `#b4433f` / `#f6e1df` / `#8f3330` | `#e88b86` / `#3a2323` / `#f0a6a2` | Refus, suppression |
| `onMedia` / `scrim` | `#ffffff` / `rgba(20,12,14,.62)` | idem | Texte et voiles sur photo         |
| `glass.bg86` / `glass.surface92` | rgba pré-calculées | idem | Barres translucides (remplace `color-mix`) |

**Règle de contraste** : `accent`, `gold`, `sage`, `plum`, `sky`, `danger` servent aux
surfaces, icônes et marques ; **tout texte sur un fond `*Soft` utilise `*Ink`** ;
`ink3` n'est jamais du texte courant (`meta` 13 px est en `ink2`). Le test de la Phase 6
énumère les **paires autorisées** (fond × rôle de texte) et échoue sur toute paire hors
liste, dans les quatre combinaisons palette × schéma :

| Fond              | Rôle de texte          | Token       | Seuil |
| ----------------- | ---------------------- | ----------- | ----- |
| `bg`, `surface*`, `paper` | body, meta     | `ink`, `ink2` | 4,5:1 |
| `bg`, `surface*`  | display ≥ 22 px        | `ink`, `ink2`, `ink3` | 3:1 |
| `accentSoft`, `goldSoft`, … | tout texte   | `*Ink`      | 4,5:1 |
| `accent` (bouton) | label ≥ 15 px 600      | `inkOnAccent` | 3:1 (composant) |
| photo + `scrim`   | tout texte             | `onMedia`   | 4,5:1 |

### 2.2 Échelles

| Famille   | Tokens                                                                       |
| --------- | ---------------------------------------------------------------------------- |
| Typo      | `xs 12 · sm 13 · base 15 · md 17 · lg 22 · xl 30 · 2xl 40 · 3xl 56`          |
| Rayons    | `xs 8 · sm 12 · md 18 · lg 26 · xl 36 · full 999`                            |
| Espaces   | `1:4 · 2:8 · 3:12 · 4:16 · 5:24 · 6:32 · 7:48 · 8:64`                        |
| Durées    | `fast 140 · base 240 · slow 460` ms                                          |
| Easing    | `ease [0.32,0.72,0,1]` · `easeSoft [0.4,0,0.2,1]`                            |
| Springs   | `firm {380,32}` · `pill {420,36}` · `soft {240,17}` · `lively {700,22}`      |
| Ombres    | `sm / md / lg` teintées (deux couches : `boxShadow` multi-couches de RN ≥ 0.76) |
| Icônes    | `xs 15 · sm 17 · md 20 · lg 24 · xl 28`                                      |
| z         | `base 0 · sticky 10 · sheet 20 · overlay 30 · toast 40 · bubble 50`          |

### 2.3 Tokens propres au mobile

| Token                 | Valeur                              | Pourquoi                                                                 |
| --------------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| `hit.min`             | 44                                  | Cible tactile minimale. Le web est à 26–40 px.                            |
| `density`             | `compact 0.85 / normal 1 / airy 1.15` | Multiplie espaces et hauteurs de ligne. Préférence de personne.         |
| `slot.height`         | **24 / 30 / 38** selon densité      | Une heure = 48 px ≥ `hit.min` même en compact. Base du `slotZoom` (pinch 0,8–1,6, par appareil, conservé). |
| `font.maxScale`       | 1,2 dans la grille, 1,6 ailleurs    | `maxFontSizeMultiplier` : Dynamic Type / taille Android ne cassent pas la grille. |
| `motion.level`        | `full / reduced / off`              | Système (`AccessibilityInfo.isReduceMotionEnabled`) ⊕ réglage utilisateur. |
| `effects.grain`       | booléen + palier de performance     | Tuile PNG 160 px, opacité 0,035 / 0,05 ; désactivée si la mesure de frame au premier lancement est mauvaise. Pas lié à `motion`. |
| `mood.*`              | `aube, jour, soir, nuit, neige, été, automne, printemps` | Paire de dégradé + teinte de texte, déclinées clair/sombre × palette. Fond d'en-tête d'occurrence et de chapitre. **Aucune image générée.** |
| `tabbar.height`       | 56 + safe-area                      | Une seule réservation d'espace.                                          |
| `safeArea.*`          | insets                              | `react-native-safe-area-context`.                                        |

## 3. Composants de base (`apps/mobile/src/ui`)

Le kit web ne se porte pas (DOM, CSS, framer-motion). On réécrit en gardant les
**contrats de props**.

| Composant            | Hérite de (web)                       | Notes mobile                                                                                      |
| -------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `Text`               | `.serif/.eyebrow/.muted`              | `display / title / body / meta / eyebrow`, `tabular`.                                             |
| `Button`             | `Button`                              | ≥ 44, `loading`, haptique légère sur `primary`.                                                   |
| `Card`               | `Card`                                | `Pressable`, `scale 0.98` au toucher.                                                             |
| `Chip`               | `Chip`                                | Hauteur 32, `hitSlop` jusqu'à 44 ; texte en `*Ink`.                                               |
| `Segmented`          | `Segmented<T>`                        | Rail 44 (items 40) ; pastille Reanimated **par instance** (corrige le `layoutId` global du web). |
| `Sheet`              | `Modal` ancrée en bas                 | Détentes 40 % / 45 % / 92 %, drag-to-dismiss, clavier géré, garde « non enregistré ». ADR-008.     |
| `FormSheet`, `useConfirm`, `Toast` (+ action), `Field`, `Input`, `Textarea`, `Switch` | idem | `enterKeyHint`, erreurs inline, auto-grow, `liveRegion`. |
| `DateField / TimeField / DurationField / RecurrenceField` | — | Pickers natifs, pas de 30 min, « toute la journée », plage multi-jours, « Tous les [n] [unité] ». |
| `PersonPicker`       | `PersonPicker`                        | Tri-état : moi / l'autre / à deux.                                                                |
| `Avatar`             | `Avatar`                              | + anneau de présence.                                                                             |
| `Icon`               | `Icon`                                | `react-native-svg`, mêmes chemins (`packages/icons`), + ≈ 30 glyphes.                             |
| `Img`, `Lightbox`    | `Img`, `Lightbox`                     | `expo-image`, tailles `thumb / medium / full` ; pan / pinch / double-tap / swipe-down / vidéo.    |
| `Empty`, `Stat`, `Progress`, `Divider`, `PageHeader`, `Grain` | idem | `Grain` = overlay PNG piloté par `effects.grain`.                   |

## 4. Le calendrier

### 4.0 Ce qui fait Nous dans une grille — et ce qui est interdit

Une grille horaire est, par défaut, le vocabulaire de Google/Apple Calendar. Cinq partis
pris sobres pour qu'elle soit Nous :

1. **Papier, pas réglure.** La colonne est `surface2` grainée ; **aucune ligne de
   demi-heure** ; les heures sont des repères courts (8 px) dans la gouttière, chiffres
   Fraunces tabulaires « 9 h », « 14 h » en `ink2` ; seule la ligne « maintenant »
   traverse (accent + petit cœur). Le pas de 30 min se **sent** (accrochage, haptique,
   fantôme) et ne se voit pas.
2. **Cartes posées, pas barres colorées.** `EventBlock` **sans bord gauche** : carte
   `paper` `r-sm` 12 avec ombre `sm` teintée ; la couleur est un fond teinté à ≈ 14 %
   (couleur d'avatar pour un événement perso, `accentSoft` pour une activité). Deux
   items qui se chevauchent sont rendus en cartes décalées de 6 px « l'une sur l'autre »
   plutôt qu'en colonnes égales (au-delà de deux : colonnes).
3. **Deux voix.** Titre Fraunces 500 pour tout ce qui est « nous » (activité, moment,
   souvenir) ; Inter 600 pour un événement perso. Le dégradé `accentSoft → goldSoft` de
   `.upnext` est **réservé** à « nous » (activité acceptée, compte à rebours, bulle).
4. **Marques, pas pastilles.** Aujourd'hui = petit cœur plein sous le chiffre (jamais un
   disque) ; moment = étoile ; souvenir = `MemoryStamp` (photo à coin replié) ;
   activité = cœur ; perso = point de la couleur de la personne. Mois et Année
   n'utilisent que ces quatre marques et des chiffres Fraunces, **aucun titre**.
5. **La nuit repliée.** La grille montre 7 h → 23 h par défaut (`hourRange`), la nuit
   repliée en une bande « 🌙 nuit » d'un créneau, dépliable. L'heure d'un bloc saisi
   s'écrit « de 9 h 30 à 11 h » en Fraunces italique au-dessus du bloc, jamais « 09:30–11:00 ».

**Anti-motifs** (vérifiés à la revue de Phase 7) : disque « aujourd'hui », barre latérale
colorée, lignes de 30 min, chips de catégorie sur les blocs, en-têtes gris, ripple
Material, badge bleu de compteur, en-tête « MAR 8 » en capitales avec chiffre cerclé,
segmenté de vues en haut de l'écran.

### 4.1 Composants (`features/calendar/ui`)

- **`TimeGrid`** : gouttière 44 px, colonnes `surface2`, ligne « maintenant », nuit
  repliée. Hauteur de créneau = `slot.height[density] × slotZoom`.
- **`EventBlock`** : selon §4.0 ; états `proposed` (pointillés `plum`, fond `plumSoft`),
  `accepted` (dégradé « nous » + cœur), `conflict` (liseré `gold`), `selected` (poignées
  visibles, hauteur visuelle ≥ 44), `dragging` (ombre `lg`, scale 1.02, haptique au snap).
  Texte : < 28 px → titre seul 12 px ; < 24 px → titre tronqué, pas de méta. Zone
  tactile = rectangle étendu à 44 px centré ; le bloc dont le centre est le plus proche
  du doigt gagne. `accessibilityLabel` par `describeItem`.
- **`Handles`** : pilules 28 × 12 dépassant le bloc sélectionné, `hitSlop` 44.
- **`AllDayBand`** : bandes `r-full` ; « sans heure » avec badge horloge.
- **`HabitPill`** : pilule cochable (`sage` quand faite). **Tap → sheet courte « Alors,
  vous l'avez fait ? » : Oui / Non / Rattraper (bouton)** ; Rattraper → date + heure.
  Aucune action cachée derrière un long-press.
- **`MemoryStamp`** : vignette 40 px à coin replié (souvenir sans heure) ou carte d'un
  créneau (avec heure).
- **`MomentStar`** : étoile à 6 branches de `moment.color` (défaut `gold`), `emoji` au
  centre si présent ; ne pulse que pour la prochaine occurrence (4 %, 2,4 s).
- **`CountdownCard`** : nombre Fraunces `xl` en **`accentInk`**, « dodos » en `eyebrow`,
  dégradé « nous » ; `gold` plein le jour J avec « C'est aujourd'hui 🤍 ».
- **`MonthCell`** : chiffre Fraunces + jusqu'à quatre marques + bandes multi-jours ;
  jamais de titre. **`YearTile`** : mois en Fraunces, étoiles de moments, nombre de souvenirs.
- **`DayPager`** (3 pages recyclées), **`DateStrip`** (les sept jours au-dessus de la
  page, swipe partagé avec le pager), **`DayCut`** (la coupe d'un jour : tranche de 7 h à
  23 h, marques posées à leur heure), **`DayPhrase`** (« libre de 13 h 30 à 17 h »), pilule
  **« Aujourd'hui »** (visible seulement hors d'aujourd'hui), titre de date Fraunces en
  haut à gauche (« septembre 2026 », tappable → Mois). Pas de `ViewSwitch`
  ([ADR-010](adr/ADR-010-jour-dabord.md)).

### 4.2 `ProposalBubble`

Un composant, trois rendus :

- **`compact`** (Accueil, liste Propositions) : photo 56 px, « Mimi vous propose », titre
  Fraunces, « sam. 20 h · 2 h · Luigi », actions **Oui** / **Voir**.
- **`full`** (Sheet 45 % → 92 %) : photo de couverture, titre, lignes date / heure /
  durée / lieu / catégorie, description, petit mot en Fraunces italique, « tour n° 2 » et
  le diff de contre-proposition rendu « ~~vendredi 19 h~~ → samedi 20 h », actions
  **Oui** / **Plutôt…** / **Non**.
- **`EventBlock.proposed`** dans la grille (pointillés `plum`, tap → `full`).

Côté proposeur : même bulle, état « En attente de Mimi », actions **Modifier** /
**Retirer** ; contre-proposition reçue : « Mimi propose plutôt… » + diff + Oui / Plutôt… / Non.

Animations (l'**état est écrit avant** toute animation) :

- **Oui** : haptique `success` ; cœur spring `soft` ; 12 cœurs pendant 1,1 s en
  `pointerEvents="none"` (z `bubble`) ; la bulle devient carte `accepted` et se ferme à 600 ms.
- **Non** : c'est la **bulle** qui s'enfuit — recul 12 px, deux oscillations ±2,5°, sortie
  d'écran ≈ 420 ms spring `lively`, 💨. Le bouton ne fuit jamais (ce vocabulaire reste à
  « la demande »). Toast « Proposition refusée · Annuler » 5 s.
- **Plutôt…** : la Sheet passe à 92 %, `CounterProposalForm` (date, heure, durée, lieu,
  autres, petit mot) remplace les actions ; envoi → secousse + remount.
- `reduced` : fondu 140 ms pour les trois.

### 4.3 `Constellation`

Un seul composant, dans l'onglet Souvenirs (la vue Année du calendrier ne montre que des
`MomentStar` sur les vignettes, sans traits).

- **Disposition** : chemin vertical défilable ; **une étoile par occurrence**, ordonnées par
  date, sections par année en Fraunces `xl` ; x alterné gauche/droite (± 28 % de la
  largeur) le long d'un trait `line` en courbes de Bézier ; l'occurrence à venir en tête,
  étoile creuse + « Encore N dodos ».
- **Étoile** : `moment.color`, `emoji` au centre, photo de couverture en pastille 56 px à
  côté, cible 44 px, étiquette titre Fraunces + date `meta`, écart vertical minimal 56 px
  (collision résolue).
- **Interactions** : tap → occurrence ; long-press → aperçu photo ; pas de drag.
- **État premier** : l'`anniversary` importé + trois étoiles en pointillés « Première
  rencontre », « Premier rendez-vous », « Saint-Valentin » qui créent le moment au tap.
- **Occurrence** et **chapitre** : en-tête sur fond `mood.*`, `MoodPicker` = huit
  pastilles nommées.

### 4.4 Navigation au pouce

Voir [02 §2](02-architecture.md) : tabbar Accueil · Calendrier · [+] · Souvenirs ·
Messages ; « + » = Sheet de création à 40 % ; **plus de `ViewSwitch`** — le calendrier n'a
plus qu'une vue ([ADR-010](adr/ADR-010-jour-dabord.md)) — seule « Aujourd'hui » reste en bas,
et seulement hors d'aujourd'hui ;
avatar/présence en haut à droite → Réglages ; Accueil ordonné pour que les actions
soient dans le tiers bas ; aucun push dans l'onglet Calendrier.

## 5. Mouvement : règles

1. Chaque animation a une fonction. Aucune décoration en boucle hors le cœur de
   chargement et l'étoile de la prochaine occurrence.
2. `useMotion()` exporte `{ level, spring(name), timing(name), stagger(i) }` et c'est la
   **seule** API d'animation autorisée (ESLint : primitives Reanimated seulement dans
   `src/ui/motion/*`). En `reduced`, les déplacements deviennent des fondus ; en `off`,
   tout est instantané.
3. Les gestes tournent sur le thread UI (worklets) ; le JS n'est prévenu qu'au relâchement.
4. Haptiques (`expo-haptics`) : `selection` au snap, `light` à la saisie, `success` à
   l'acceptation, `warning` au refus. Désactivables.
5. Transitions d'écran : celles de la pile native.
6. **Jamais ralentir** : l'état est écrit avant toute animation ; aucune animation de
   confirmation ne dépasse 460 ms ; les effets plus longs (pluie de cœurs 1,1 s) sont en
   `pointerEvents="none"` et n'empêchent rien.
7. `expo-image` transition = `duration.base` du niveau (0 en `off`) ; interpolation de
   palette 1,3 s → 0 en `reduced`/`off`.

## 6. Ce qui ne se traduit pas et ce qu'on fait

| Web                              | Mobile                                                       |
| -------------------------------- | ------------------------------------------------------------ |
| `backdrop-filter: blur()`        | iOS : `expo-blur` (tabbar, fond des sheets). **Android** : fond de sheet crème semi-opaque (≈ 92 %) sans flou (`expo-blur` ne traverse pas une frontière `Modal`) ; tabbar avec `experimentalBlurMethod="dimezisBlurViewSdk31Plus"`, repli opaque sous API 31. Vérifié dans la galerie de la Phase 6 sur l'Android du couple. |
| grain `feTurbulence` SVG         | tuile PNG 160 px, `effects.grain`                            |
| `color-mix()`                    | `glass.*` pré-calculés                                       |
| `font-variation-settings`        | instances statiques de Fraunces (`expo-font`) — les axes `SOFT/WONK` sont déjà inertes sur le web |
| `clamp()` / `vw`                 | `useWindowDimensions()` + échelle fixe                       |
| transitions de palette 1,3 s     | interpolation Reanimated sur le thème racine                 |
| `:hover`                         | `pressed` seulement                                          |

## 7. Livrables de la Phase 6

- `packages/theme` : tokens, `createTheme(palette, scheme, density)`, générateur CSS +
  test de parité, **test des paires de contraste autorisées** (§2.1).
- `packages/icons` : paths + liste, vérification « une icône = un path ».
- `apps/mobile/src/ui/*` + `ui/motion/*` (`useMotion`, springs nommés).
- `/dev/ui` : galerie de tous les composants dans les 4 thèmes, **avec bascules** densité,
  `motion.level`, échelle de police 1,3 / 2,0.
- **Quatre maquettes vivantes** dans `/dev/ui`, statiques, sur données factices, sans
  geste ni repository : **Jour** (TimeGrid + six EventBlock dans tous les états, ligne
  « maintenant », bande tout-la-journée, nuit repliée), **Mois** (MonthCell avec les
  quatre marques et une bande multi-jours, agenda du jour dessous), **ProposalBubble.full**,
  **Constellation** (cinq étoiles). Le couple les valide sur les deux téléphones ; une
  capture de chacune est commitée comme référence Maestro. En Phases 7/9/10, les
  composants sont déplacés vers `features/*/ui` et câblés **sans changement visuel**.
- Polices embarquées, tuile de grain, splash et icône d'app.

## 8. Accessibilité tactile

1. **Chaque geste a un équivalent visible** : drag ↔ champs de la sheet ; long-press ↔
   menu « ⋯ » de l'aperçu ; swipe ↔ flèches ‹ › dans l'en-tête de date ; pinch ↔ réglage
   densité.
2. `accessibilityLabel` des items composé dans le domaine par `describeItem(item)`
   (« Dîner, de 19 h à 21 h, activité à deux proposée par Mimi »), testé en Node.
3. `accessibilityRole` et `accessibilityState` sur tous les pressables du kit.
4. Cibles ≥ 44 pt mesurées en Phase 6 (kit) **et** en Phases 7, 9, 10, 14 pour
   `EventBlock`, poignées, `MonthCell`, `HabitPill`, `MomentStar`, `ReactionBar`,
   `MemoryStamp`.
5. Audit VoiceOver / TalkBack en Phase 18 sur six écrans nommés : Accueil, Jour,
   ProposalBubble, Occurrence, Souvenir, Messages.
