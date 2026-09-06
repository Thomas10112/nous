# 06 — Moteur calendrier

> Statut : **proposition à valider** (Phase 7). Le moteur est de la logique pure
> (`packages/domain/calendar`), sans React ni React Native : il se teste en Node en
> quelques millisecondes et se réutilise tel quel sur le web plus tard.

## 1. Pourquoi un moteur maison et pas une bibliothèque

Les bibliothèques de calendrier React Native (`@howljs/calendar-kit`, `react-native-big-calendar`)
livrent une **apparence** autant qu'une mécanique : en-têtes, grille, blocs d'événements,
gestes. Or l'identité visuelle de Nous est la priorité absolue, et une activité proposée
(bulle en pointillés, contre-proposition), une occurrence d'habitude (à cocher), un
souvenir (photo) et un moment important (constellation) ne sont pas des « events »
génériques. Adapter une bibliothèque à ça revient à se battre contre elle. Par ailleurs
`@howljs/calendar-kit` n'a plus été publié depuis dix mois au moment de l'audit et son
support de Reanimated 4 n'est pas établi.

Ce que ces bibliothèques ont de réellement difficile — placement des blocs qui se
chevauchent, accrochage à la grille, pagination des jours, calcul des multi-jours —
tient en quelques fonctions pures bien testées. C'est ce que le moteur fournit. Le rendu
et les gestes restent dans l'app (Reanimated + Gesture Handler), fins et à notre image.

Voir ADR-003.

## 2. Vocabulaire

- **Slot** : 30 minutes. `slotIndex = (heure × 60 + minute) / 30`, 0 → 47.
- **Jour civil** : chaîne `YYYY-MM-DD` (`LocalDate`), jamais un `Date` JS pour les
  calculs de jours (le `T12:00:00` de la v1 était une rustine pour ce problème).
- **Instant** : `timestamptz` ISO. Conversions par `Intl`/`date-fns-tz` uniquement à la
  frontière (affichage, saisie).
- **Item de calendrier** (`CalendarItem`) : ce que la grille sait placer. Union :

```ts
type CalendarItem =
  | { type: 'event';            event: PersonalEvent | CoupleActivity }
  | { type: 'habit';            habit: Habit; occurrence: HabitOccurrence | Virtual }   // Virtual = pas encore de ligne
  | { type: 'memory';           memory: Memory }
  | { type: 'moment';           moment: ImportantMoment; year: number; occurrence?: MomentOccurrence }
  | { type: 'countdown-marker'; countdown: Countdown; date: LocalDate }
```

Chaque item expose une **fenêtre** normalisée `{ startDate, endDate, startAt?, endAt?, allDay, untimed }`
via `windowOf(item)` : c'est tout ce que la mise en page regarde.

## 3. Fonctions du moteur

### 3.1 Expansion d'une plage

```ts
itemsForRange(range: { from: LocalDate; to: LocalDate }, sources: {
  events, memories, habits, habitOccurrences, moments, momentOccurrences, countdowns
}): CalendarItem[]
```

- filtre les événements/souvenirs qui touchent la plage (`start_date ≤ to && end_date ≥ from`) ;
- **calcule** les occurrences d'habitude via `recurrence.occurrencesBetween` et les marie
  aux lignes `habit_occurrences` existantes ;
- **calcule** les occurrences annuelles des moments (`occurrenceDate(moment, year)`) ;
- exclut les lignes en corbeille ;
- renvoie une liste stable, triée (`sortItems`).

Les vues Mois et Année n'appellent que ça. Les vues Jour et Semaine enchaînent avec la
mise en page.

### 3.2 Mise en page d'un jour (`layoutDay`)

Entrée : items d'un jour avec heure. Sortie : pour chaque item, `{ top, height, column, columns }`
en unités de slot, où `column/columns` résolvent les chevauchements :

1. trier par début puis durée décroissante ;
2. former des **groupes de collision** (union-find sur les intervalles) ;
3. dans chaque groupe, affecter la première colonne libre (algorithme de coloration
   d'intervalles) ; `columns` = nombre de colonnes du groupe ;
4. un item plus court **entièrement contenu** dans un autre reçoit un léger décalage
   (`nested = true`) plutôt qu'une colonne, pour garder l'aspect « carte posée sur carte »
   de Nous.

Les items **sans heure** et **tout-la-journée** vont dans `layoutAllDayBand(items)` qui
calcule des **lanes** horizontales (pour les multi-jours, la lane est constante sur toute
la semaine : `layoutWeekBands`).

### 3.3 Accrochage et gestes (`snap`, `move`, `resize`)

Fonctions pures appelées depuis les *worklets* Reanimated :

```ts
snapToSlot(y: number, slotHeight: number): number            // index de slot le plus proche
moveWindow(w: Window, deltaSlots: number, deltaDays: number): Window
resizeStart(w: Window, deltaSlots: number, minSlots = 1): Window
resizeEnd(w: Window, deltaSlots: number, minSlots = 1): Window
clampToDay(w: Window): Window                                  // 00:00 → 24:00, sinon bascule multi-jours explicite
```

Elles ne connaissent ni l'écran ni le DOM : on peut leur écrire une table de vérité.
Le geste envoie des `deltaSlots` ; le composant affiche l'aperçu (`patchLocal` façon
Moodboard v1) et n'écrit dans le repository **qu'au relâchement**.

### 3.4 Collisions (`conflictsOf`)

`conflictsOf(window, items): CalendarItem[]` — items dont la fenêtre horaire chevauche.
Utilisé pour : le liseré discret sur les blocs en conflit, l'avertissement doux à la
création d'une activité (« Mimi a déjà "Dentiste" à cette heure »), jamais pour bloquer.

### 3.5 Grilles de mois et d'année

```ts
monthGrid(year, month, { weekStartsOn: 1 }): { weeks: LocalDate[][]; leading: number; trailing: number }
yearOverview(year, items): { month: number; counts: Record<CalendarItem['type'], number>; moments: … }[]
```

### 3.6 Navigation

`shiftRange(range, view, delta)` pour le swipe (jour ±1, semaine ±7, mois ±1, année ±1),
`rangeForView(view, anchorDate)`, `todayRange()`. Le composant « pager » garde trois pages
(précédente / courante / suivante) rendues, la logique décide des dates.

## 4. Vues et ce qu'elles consomment

| Vue      | Moteur                                            | Rendu (app)                                                   |
| -------- | ------------------------------------------------- | ------------------------------------------------------------- |
| Home     | `itemsForRange(aujourd'hui → +7)`, prochains moments, comptes à rebours | Cartes « Aujourd'hui », « Bientôt », présence, message rapide |
| Jour     | `itemsForRange` + `layoutDay` + `layoutAllDayBand` | Grille 48 slots, bande du haut, gestes drag/resize            |
| Semaine  | idem × 7 + `layoutWeekBands`                       | 7 colonnes, pinch pour zoomer la hauteur de slot              |
| Mois     | `monthGrid` + `itemsForRange`                      | Cellules avec pastilles et 1–2 titres, tap → Jour             |
| Année    | `yearOverview`                                     | 12 vignettes, moments importants en constellation             |

## 5. Contrat de tests (Phase 7)

- `layoutDay` : 0, 1, 2 items disjoints, 2 chevauchants, 3 en chaîne (A∩B, B∩C, A∌C),
  item contenu, 10 items identiques (colonnes = 10), items de 30 min bord à bord (pas de
  collision).
- `layoutWeekBands` : multi-jours à cheval sur deux semaines, deux multi-jours imbriqués.
- `snap*` : bords (00:00, 23:30), `minSlots`, déplacement négatif, changement de jour.
- `itemsForRange` : habitude toutes les 3 semaines sur un an, moment le 29 février selon
  les deux règles, événement multi-jours qui commence avant la plage, corbeille exclue.
- Propriétés (fast-check) : `moveWindow(moveWindow(w, d), -d) = w` ; `layoutDay` ne
  produit jamais deux items de même colonne qui se chevauchent.
