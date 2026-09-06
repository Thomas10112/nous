# ADR-008 — Sheets : `@gorhom/bottom-sheet` plutôt que le composant natif Expo UI

**Statut** : proposé · **Date** : 2026-09-06 · **Phase** : 6

## Contexte

Le web n'a qu'une modale ancrée en bas par CSS, sans geste. Le calendrier a besoin de
sheets à détentes (aperçu d'événement à mi-hauteur, édition quasi plein écran, bulle de
proposition), avec drag-to-dismiss, clavier géré, et surtout une **apparence Nous**
(rayons 26 px, fond crème, poignée, dégradés).

## Options

1. **`@expo/ui` BottomSheet** (SDK 56) — SwiftUI `.sheet` / Compose `ModalBottomSheet`
   natifs, API compatible gorhom. Feeling parfaitement natif, mais style et détentes
   contraints par la plateforme (pas de fond dégradé ni de contenu Reanimated au-dessus
   de la poignée sur iOS sans contorsions), comportement différent sur les deux OS.
2. **`@gorhom/bottom-sheet` v5** — Reanimated + Gesture Handler, détentes libres,
   `BottomSheetTextInput` gérant le clavier, `BottomSheetScrollView`, fond et poignée
   entièrement stylables, mêmes gestes sur iOS et Android. Mûr, très répandu.
3. **Maison** avec Reanimated — contrôle total, coût élevé et risque de bugs de gestes.

## Décision

Option 2, encapsulée dans `ui/Sheet` (API : `snapPoints`, `onDismiss`, `dirty`,
`footer`) pour qu'aucun écran n'importe gorhom directement. Si un jour Expo UI donne le
même contrôle, on change l'implémentation de `Sheet` seulement.

## Conséquences

- Une dépendance de plus, bien maintenue, alignée sur Reanimated 4 (SDK 56).
- Les routes modales d'Expo Router (`sheets/*`) rendent un `Sheet` : navigation et sheet
  restent cohérentes (retour matériel Android = fermer la sheet).
- Garde « modifications non enregistrées » implémentée une fois dans `FormSheet`.
