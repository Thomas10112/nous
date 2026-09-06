# ADR-006 — Widgets système natifs alimentés par un snapshot partagé

**Statut** : proposé · **Date** : 2026-09-06 · **Phase** : 16 (interface préparée dès la 3)

## Contexte

Widgets iOS (WidgetKit) et Android (AppWidget) : prochaine date importante ou date
choisie, photo, compte à rebours (« ❤️ Notre anniversaire — Encore 24 dodos »),
plusieurs tailles. Un widget ne fait pas tourner React Native : il faut du code natif
ou une bibliothèque qui rend le natif à notre place, et une façon de partager les
données avec l'application.

## Options

| Option                                                                 | iOS                                        | Android                                        |
| ---------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| A. `expo-widgets` (Expo UI ; alpha en SDK 55, **stable depuis SDK 56**) | SwiftUI via Expo UI, **images via `widgetsDirectory`** (fichier de l'App Group écrit par l'app), runtime isolé : pas de hooks ni d'async, tout passe par les props | non couvert |
| B. `@bacons/apple-targets` + WidgetKit en Swift                        | tout WidgetKit, images, timelines          | —                                              |
| C. `react-native-android-widget` (config plugin Expo)                   | —                                          | widgets décrits en JSX rendus en RemoteViews, images OK |
| D. Modules natifs maison (Swift + Kotlin/Glance) via Expo Modules       | complet                                    | complet                                        |

## Décision

**iOS : A comme voie principale** (`expo-widgets`, stable depuis SDK 56, images via
`widgetsDirectory`, en TSX sans Swift) ; **B en repli** seulement si le rendu Fraunces /
crème / grain n'est pas atteignable en Expo UI — et à condition qu'un Mac soit disponible
(itérer sur du Swift WidgetKit sans Xcode = un build EAS par essai, sur un quota de 15
par mois). **Android : C**. Dans tous les cas, derrière une interface commune
`WidgetBridge` :

- l'application écrit un **snapshot** (`widget-snapshot.json` + image redimensionnée
  512 px) dans le conteneur partagé (**App Group** `group.nous.app` sur iOS,
  `SharedPreferences` + fichier interne sur Android) à chaque changement pertinent
  (comptes à rebours, moments, épinglage, photo) et à chaque ouverture ;
- le snapshot contient des **dates**, pas des textes calculés : `{ entries: [{ title,
  emoji, targetDate, format: 'dodos'|'days', imagePath }], pinnedId }` ; le widget
  calcule « Encore N dodos » **localement, chaque jour à minuit** via sa timeline
  (WidgetKit `TimelineEntry` / `updatePeriodMillis` + WorkManager) — il reste juste même
  si l'app n'est pas ouverte pendant des semaines ;
- tailles : petit (titre + nombre), moyen (photo + titre + nombre), grand (photo + les
  deux prochaines dates) ;
- tap → deep link `nous://moments/{id}`.

Quand `expo-widgets` couvrira Android, C pourra être remplacé sans toucher au snapshot
ni au domaine.

## Conséquences

- ~150 lignes de Swift (WidgetKit) et la configuration `react-native-android-widget` :
  c'est du natif assumé, isolé dans `apps/mobile/targets/` et `apps/mobile/native/`.
- Nécessite des **builds de développement** (pas Expo Go) et un compte Apple Developer
  pour l'App Group.
- Le domaine fournit `widgetEntries(countdowns, moments, now)` : la logique de « quelle
  date montrer » est testée en Node, pas dans le widget.
