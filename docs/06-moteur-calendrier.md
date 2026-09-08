# 06 — Moteur calendrier

> Statut : **proposition à valider** (Phase 7), **version 2** après relecture. Le moteur
> est de la logique pure (`packages/domain/calendar`), testable en Node ; les gestes et
> le rendu vivent dans l'app.

## 1. Pourquoi un moteur maison et pas une bibliothèque

Les bibliothèques de calendrier React Native livrent une **apparence** autant qu'une
mécanique, et cette apparence est celle que le brief refuse ([05 §4.0](05-design-system-mobile.md)).
Ce qu'elles ont de réellement difficile — chevauchements, accrochage, pagination,
multi-jours, expansion des récurrences — tient en quelques fonctions pures bien testées.
Voir ADR-003.

## 2. Vocabulaire

- **Slot** : 30 minutes. `slotIndex = (heure × 60 + minute) / 30`, 0 → 47.
- **Jour civil** : chaîne `YYYY-MM-DD` (`LocalDate`), jamais un `Date` JS pour les jours.
- **Instant** : `timestamptz` ISO ; un événement est rendu dans **son** `tz` (heure
  murale, [03 §6](03-modele-de-donnees.md)).
- **Item de calendrier** (`CalendarItem`) :

```ts
type CalendarItem =
  | { type: 'event';            event: PersonalEvent | CoupleActivity }
  | { type: 'habit';            habit: Habit; occurrence: HabitOccurrence | Virtual }
  | { type: 'memory';           memory: Memory }
  | { type: 'moment';           moment: ImportantMoment; year: number; occurrence?: MomentOccurrence }
  | { type: 'countdown-marker'; countdown: Countdown; date: LocalDate }
```

`windowOf(item)` normalise en `{ startDate, endDate, startAt?, endAt?, allDay, untimed, kind }` :

| Type                      | Fenêtre                                                                   | Rendu                     |
| ------------------------- | ------------------------------------------------------------------------- | ------------------------- |
| `event` avec heure        | `start_at → end_at` dans `tz`                                             | bloc                      |
| `event` tout-la-journée / sans heure / multi-jours | `start_date → end_date`                          | bande (+ badge si sans heure) |
| `habit` avec `time_of_day` | `time_of_day → + (duration_min ?? 30)`                                   | bloc (`HabitPill`)        |
| `habit` sans heure        | jour                                                                      | bande (`HabitPill`)       |
| `memory` avec `time`      | `time → + 30 min`                                                         | bloc (`MemoryStamp`)      |
| `memory` sans `time`      | jour                                                                      | bande (`MemoryStamp`)     |
| `moment`                  | `occurrenceDate(moment, year)`                                            | bande + étoile            |
| `countdown-marker`        | date cible                                                                | bande                     |

Les préférences `visible.*` ([03 §5.1](03-modele-de-donnees.md)) filtrent les types **avant**
la mise en page.

## 3. Fonctions du moteur

### 3.1 Expansion d'une plage

```ts
itemsForRange(range, sources: { events, memories, habits, habitOccurrences, moments,
  momentOccurrences, countdowns }, prefs: DisplayPreferences): CalendarItem[]
```

Filtre les événements/souvenirs qui touchent la plage ; **calcule** les occurrences
d'habitude (`recurrence.occurrencesBetween`, moteur écrit en Phase 3) et les marie aux
lignes existantes ; calcule les occurrences annuelles des moments ; exclut la corbeille ;
applique `visible.*` ; trie.

### 3.2 Agenda (Accueil)

`agendaFor(today, days = 7, items, moments, countdowns)` → sections « Aujourd'hui »,
« Demain », « Cette semaine », plus `nextMoment` et `countdowns` triés. C'est la source
de l'écran Accueil (Phase 7).

### 3.3 Mise en page

- `layoutDay(items)` → `{ top, height, column, columns, nested }` en slots : tri par début
  puis durée décroissante ; groupes de collision (union-find) ; deux items d'un groupe →
  cartes décalées (`nested`), au-delà → colonnes (coloration d'intervalles).
- `layoutBands(items, days)` → lanes horizontales des bandes, constantes sur toute la
  plage ; **appliqué à chaque ligne du `monthGrid`** pour les multi-jours de la vue Mois.
- `snapToSlot(y, slotHeight)`, `moveWindow(w, deltaSlots, deltaDays)`, `resizeStart`,
  `resizeEnd` (`minSlots = 1`), `clampToDay(w)`, `toSlot(x, y, geometry)`.

**Worklets.** Une fonction importée de `packages/domain` n'est pas un worklet.
Décision : `features/calendar/gestures/worklets.ts` réimplémente `snapToSlot`,
`clampToDay`, `toSlot` et `moveWindow` avec `'worklet'`, et un test Vitest prouve
l'égalité avec la version domaine sur 1 000 cas générés. Le domaine reste la référence.

### 3.4 Collisions

`conflictsOf(window, items)` — liseré `gold` sur les blocs en conflit, avertissement doux
à la création (« Mimi a déjà "Dentiste" à cette heure »), jamais bloquant.

### 3.5 Grilles

`monthGrid(year, month, { weekStartsOn: 1 })`, `yearOverview(year, items)` (par mois :
étoiles de moments, nombre de souvenirs, présence d'activités).

### 3.6 Navigation

`shiftRange(range, view, delta)`, `rangeForView(view, anchor)`, `todayRange()`. Le
calendrier est **un seul écran** ; la vue et la date ancrée vivent dans le store Zustand.

### 3.7 Arbitrage des gestes

| Geste                                  | Effet                                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| Tap bloc                               | aperçu (Sheet 45 %)                                                                       |
| Tap créneau vide                       | sélection du créneau (pré-remplit « + »)                                                  |
| Long-press **350 ms**, annulé si déplacement > 8 px avant activation | sur bloc → saisie (haptique `light`, scale 1.02) puis drag ; sur créneau vide → fantôme de 2 slots que l'on étire ; sur `HabitPill` → même aperçu que le tap (aucun sens caché) |
| Pan vertical sans activation           | scroll                                                                                    |
| Pan horizontal ≥ 24 px, angle < 30° (`activeOffsetX` / `failOffsetY`) | pager (jour ±1, semaine ±1)                                |
| Bloc saisi                             | pager et scroll désactivés ; **auto-scroll** quand le doigt est à < 56 px du bord (vitesse proportionnelle) ; en vue Jour, maintien 600 ms au bord gauche/droit → jour ±1 |
| Poignées                               | visibles sur le bloc sélectionné seulement ; pilules 28 × 12, `hitSlop` 44               |
| Pinch (Jour/Semaine)                   | `simultaneousWithExternalGesture(scroll)`, point focal conservé (le créneau sous les doigts reste sous les doigts), plage 0,8–1,6 × base, persisté par appareil, jamais pendant un drag |
| Swipe à 45°                            | scroll, pas pager                                                                         |

## 4. Vues

| Vue      | Moteur                                            | Rendu                                                                                                   |
| -------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Accueil  | `agendaFor`                                       | héros → proposition en attente → aujourd'hui → prochaine date → présence + message rapide              |
| Jour     | `itemsForRange` + `layoutDay` + `layoutBands` + `phraseOfDay` | **La vue du calendrier**, pleine largeur : titre, **phrase du jour** en serif italique, **bandeau de sept coupes**, bande du haut, grille 7 h → 23 h (nuit repliée), drag / resize / création par appui long. Balayage horizontal = jour ± 1 ; balayage du bandeau = semaine ± 1 ([ADR-010](adr/ADR-010-jour-dabord.md)). |
| ~~Semaine~~ | — | **Supprimée** : 47 px par jour en portrait, une carte n'y est plus une carte. Le bandeau de coupes la remplace comme vue d'ensemble ([ADR-010](adr/ADR-010-jour-dabord.md)). |
| Mois     | `monthGrid` + `itemsForRange` + `layoutBands` par ligne | **défilement vertical infini** (pas de pager) ; `MonthCell` = chiffre + marques + bandes, aucun titre ; tap jour = sélection + agenda du jour **sous la grille** ; tap sur l'agenda → Jour |
| Année    | `yearOverview`                                    | 12 `YearTile` (étoiles, nombre de souvenirs) ; tap → Mois                                              |

## 5. Contrat de tests (Phase 7)

- `layoutDay` : 0, 1, 2 items disjoints, 2 chevauchants (nested), 3 en chaîne, item
  contenu, 10 identiques (colonnes = 10), items bord à bord (pas de collision).
- `layoutBands` : multi-jours à cheval sur deux semaines, deux imbriqués, **sur une ligne
  de mois**.
- `snap*` / `moveWindow` : bords, `minSlots`, négatif, changement de jour ; **DST 29/03 et
  25/10** ; propriété `moveWindow(moveWindow(w, d), −d) = w` ; **égalité worklet / domaine
  sur 1 000 cas**.
- `itemsForRange` : habitude toutes les 3 semaines sur un an, moment le 29 février (deux
  règles), multi-jours commençant avant la plage, corbeille exclue, `visible.habits =
  false` retire les habitudes.
- `agendaFor` : sections, moment à venir, compte à rebours à 0.
- Gestes (Maestro sur l'**Android de référence** nommé en Phase 1, T10) : long-press puis
  déplacement < 8 px ne bloque pas le scroll ; drag au bord fait défiler ; pinch garde le
  point focal ; swipe à 45° = scroll ; un bloc de 30 min en compact reste saisissable.
- Performance : vue Jour avec 300 items, **p99 sous le budget de l'écran mesuré**
  (8,3 ms à 120 Hz, 16,7 ms à 60 Hz) et aucune frame > 25 ms pendant 5 s de glissé continu,
  mesuré par `useFrameCallback` (compteur de frames longues) sur l'Android de référence.
