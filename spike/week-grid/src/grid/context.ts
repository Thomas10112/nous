import { createContext, useContext } from 'react'
import type { SharedValue } from 'react-native-reanimated'
import type { SlotWindow } from '../domain/time'

/**
 * Valeurs partagées (thread UI) de la grille, lues par les colonnes, les
 * blocs et les poignées. Tout ce qui bouge pendant un geste passe par ici,
 * jamais par un setState.
 */
export interface GridShared {
  /** hauteur d'un créneau de 30 min en px (zoom compris) */
  slotH: SharedValue<number>
  /** défilement vertical courant de la grille */
  scrollY: SharedValue<number>
  /** bords gauches et largeurs des 7 colonnes (figés au début d'un geste) */
  colLefts: SharedValue<number[]>
  colWidths: SharedValue<number[]>
  /** origine de la grille dans la fenêtre (pour absoluteX/absoluteY) */
  gridPageX: SharedValue<number>
  viewportTop: SharedValue<number>
  viewportHeight: SharedValue<number>
  /** vitesse d'auto-défilement demandée par un bloc en cours de drag (px/frame) */
  autoScroll: SharedValue<number>
  /**
   * Un bloc est en cours de déplacement, de redimensionnement ou de création.
   * Le pager et le pincement s'effacent devant lui, et l'auto-défilement tourne.
   */
  dragActive: SharedValue<number>
  /**
   * N'IMPORTE quel geste est en cours — y compris ceux qui ne touchent pas un
   * bloc : pager, pincement, défilement natif. C'est lui, et non `dragActive`,
   * qui arme le compteur d'images : autrement le compteur affiche « 0/0 » après
   * un balayage, ce qui se lit « aucune image longue » alors que cela veut dire
   * « rien n'a été mesuré ». Le critère de la phase 1 en dépend.
   */
  gestureActive: SharedValue<number>
  /** 1 = la nuit est repliée en deux bandes (parti pris n°5 du design system) */
  nightFolded: SharedValue<number>
  /** hauteur d'une bande de nuit, en px */
  bandH: SharedValue<number>
  /** jour en colonne focus (portrait) */
  focusDay: SharedValue<number>
  /**
   * 1 en vue Jour : le déplacement latéral ne change plus de journée.
   * C'est le geste que l'ADR-010 fait disparaître — une seule colonne, donc
   * plus rien à arbitrer entre « je change d'heure » et « je change de jour ».
   */
  lockDay: SharedValue<number>
  /** largeurs cibles des colonnes focus / étroite */
  focusW: SharedValue<number>
  narrowW: SharedValue<number>
}

export interface GridActions {
  onCommit: (id: string, window: SlotWindow) => void
  onSelect: (id: string | null) => void
  onCreate: (window: SlotWindow) => void
}

export const GridSharedContext = createContext<GridShared | null>(null)
export const GridActionsContext = createContext<GridActions | null>(null)

export function useGridShared(): GridShared {
  const ctx = useContext(GridSharedContext)
  if (!ctx) throw new Error('useGridShared hors de la grille')
  return ctx
}

export function useGridActions(): GridActions {
  const ctx = useContext(GridActionsContext)
  if (!ctx) throw new Error('useGridActions hors de la grille')
  return ctx
}
