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
| A. `expo-widgets` (Expo UI, alpha, mars 2026)                          | SwiftUI via Expo UI, **pas d'images** pour l'instant | non couvert                              |
| B. `@bacons/apple-targets` + WidgetKit en Swift                        | tout WidgetKit, images, timelines          | —                                              |
| C. `react-native-android-widget` (config plugin Expo)                   | —                                          | widgets décrits en JSX rendus en RemoteViews, images OK |
| D. Modules natifs maison (Swift + Kotlin/Glance) via Expo Modules       | complet                                    | complet                                        |

## Décision

**Le snapshot d'abord, l'implémentation ensuite.** Sur iOS, la contre-expertise indique
que `expo-widgets` (Expo UI) pourrait déjà afficher une **image locale** (`Image` avec un
fichier de l'App Group) — ce qui contredit le statut « alpha, sans images » relevé
ailleurs. Ce point n'est pas tranché ici : la Phase 16 commence par **deux jours de
prototype `expo-widgets`** ; s'il rend photo + compte à rebours en TSX, on garde A ;
sinon **B**. Android : **C**. Dans tous les cas, derrière une interface commune
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

Quand `expo-widgets` supportera les images et Android, on pourra remplacer B par A sans
toucher au snapshot ni au domaine.

## Conséquences

- ~150 lignes de Swift (WidgetKit) et la configuration `react-native-android-widget` :
  c'est du natif assumé, isolé dans `apps/mobile/targets/` et `apps/mobile/native/`.
- Nécessite des **builds de développement** (pas Expo Go) et un compte Apple Developer
  pour l'App Group.
- Le domaine fournit `widgetEntries(countdowns, moments, now)` : la logique de « quelle
  date montrer » est testée en Node, pas dans le widget.
