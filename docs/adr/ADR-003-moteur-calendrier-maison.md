# ADR-003 — Moteur de calendrier maison plutôt qu'une bibliothèque

**Statut** : proposé · **Date** : 2026-09-06 · **Phase** : 7

## Contexte

Le calendrier doit offrir des vues Jour/Semaine/Mois/Année, une grille de 30 minutes,
le drag & drop, le redimensionnement, les multi-jours, les événements sans heure, et
rendre cinq natures d'items (événement, activité proposée/acceptée, occurrence
d'habitude, souvenir, moment important). L'identité visuelle de Nous est la priorité
absolue : pas de look Google Calendar / SaaS.

## Options

1. **`@howljs/calendar-kit`** — vues jour/3 jours/semaine, drag pour créer/éditer, pinch,
   Reanimated + Gesture Handler. Dernière publication il y a ~10 mois (2.5.6),
   compatibilité Reanimated 4 / RN 0.85 non établie. Rendu d'item personnalisable, mais
   la structure (en-têtes, bande tout-la-journée, gestion des pages) est la sienne.
2. **`react-native-big-calendar`** — plus simple, pas de drag & drop natif fluide.
3. **Moteur maison** : logique pure (`packages/domain/calendar`) + rendu Reanimated dans
   l'app.

## Décision

Option 3. La partie difficile (chevauchements, accrochage, multi-jours, expansion des
récurrences) est de la logique pure, testable en Node ; la partie visible doit de toute
façon être entièrement à l'image de Nous. Une bibliothèque nous ferait porter son
apparence, ses limites de personnalisation et son risque de maintenance, pour nous
épargner du code que nous devons de toute façon maîtriser.

## Conséquences

- Plus de code initial (≈ 1 500 lignes de logique + tests, ≈ 2 000 lignes de vues).
- Contrôle total des gestes (long-press pour saisir, drag des poignées, swipe entre jours,
  pinch sur la hauteur de slot) et des animations.
- Réutilisable sur le web ensuite (la logique ne dépend pas de la plateforme).
- Risque à surveiller : performance du Mois avec beaucoup d'items → rendu par
  colonne mémoïsé, items hors écran non montés, mesures dans des worklets.
