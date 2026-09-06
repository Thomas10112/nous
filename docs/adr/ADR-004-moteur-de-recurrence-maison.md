# ADR-004 — Moteur de récurrence maison (sous-ensemble de RFC 5545)

**Statut** : proposé · **Date** : 2026-09-06 · **Phase** : 3 (moteur, domaine pur — consommé par le calendrier dès la Phase 7 et par les moments en Phase 10) ; la Phase 12 n'ajoute que `describe`, `toRRule` et l'interface des habitudes

## Contexte

Les habitudes ont besoin de « Tous les [n] [jours|semaines|mois|années] », de
« lundi + mercredi », de « le 15 du mois », et de règles avancées (2e lundi, dernier
jour). Les moments importants se répètent chaque année (avec le cas du 29 février). Le
suivi est indépendant par occurrence. Les rappels locaux (« Alors, vous l'avez fait ? »)
doivent se calculer hors ligne.

## Options

1. **`rrule`** (npm) — complet, RRULE/RDATE/EXDATE, mais lourd (~60 Ko), API orientée
   `Date` UTC avec des pièges de fuseau connus, et bien plus que ce dont on a besoin.
2. **`date-fns` + code ad hoc** par écran — rapide, mais la logique se disperse.
3. **Moteur maison** : type `RecurrenceRule` (JSON, §8.1 du modèle de données), itération
   en **dates civiles** (`YYYY-MM-DD`), `occurrencesBetween`, `nextOccurrence`,
   `occurrenceDate(moment, year)` ; conversion vers/depuis une chaîne RRULE pour l'export.

## Décision

Option 3. Le domaine ne manipule que des dates civiles : pas de fuseau, pas de DST,
pas de surprise. Les règles supportées sont exactement celles de l'interface. Tests par
tables de vérité + propriétés (fast-check). Une centaine de lignes de logique, trois
cents de tests.

## Conséquences

- On ne supporte pas tout RFC 5545 (pas de `BYSETPOS` arbitraire, `BYHOUR`, `WKST`
  variable). Si un jour il faut importer un `.ics`, on ajoutera une conversion partielle.
- L'heure d'une occurrence (`time_of_day`) est appliquée **après** le calcul de la date,
  dans le fuseau de l'appareil : « tous les jours à 21 h » reste 21 h locale même en
  voyage.
