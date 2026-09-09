import React, { useEffect, useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import type { DemoEvent } from '../data/demo'
import {
  SLOTS_PER_DAY,
  clamp,
  dayAt,
  formatRange,
  moveWindow,
  resizeEnd,
  resizeStart,
  slotToY,
  yToSlot,
  type DayScale,
  type SlotWindow,
} from '../domain/time'
import { useGridActions, useGridShared } from '../grid/context'
import { EDGE_AUTOSCROLL, HIT_MIN, LONG_PRESS_MS, colors, fonts, radius, springs, tint } from '../theme'

interface Props {
  event: DemoEvent
  selected: boolean
  /** colonne de mise en page (chevauchements) */
  column: number
  columns: number
  nested: number
}

const hapticSelect = () => void Haptics.selectionAsync()
const hapticLift = () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
const hapticDone = () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

/** Marges d'une carte dans sa voie, et décalage des cartes « posées ». */
const INSET = 4
const NESTED_STEP = 10

/**
 * Un bloc de la grille : carte « posée » (05 §4.0), saisie par long-press,
 * déplacée sur le thread UI, accrochée au créneau, poignées quand sélectionné.
 *
 * Toutes les conversions créneau ↔ pixel passent par `slotToY` / `yToSlot` :
 * avec la nuit repliée l'échelle n'est plus linéaire, et un calcul en
 * `slot * hauteur` afficherait une fausse heure.
 */
export function EventBlock({ event, selected, column, columns, nested }: Props) {
  const grid = useGridShared()
  const actions = useGridActions()
  const { window } = event
  const length = window.endSlot - window.startSlot

  // état du geste, thread UI
  const lifted = useSharedValue(0)
  const fingerDX = useSharedValue(0)
  const fingerDY = useSharedValue(0)
  const scrollAtStart = useSharedValue(0)
  const lastSnap = useSharedValue(0)
  const resizeDelta = useSharedValue(0)
  const resizing = useSharedValue<0 | 1 | 2>(0) // 1 = début, 2 = fin

  /** L'échelle courante, telle que la voit le thread UI. */
  const scale = (): DayScale => {
    'worklet'
    return { slotH: grid.slotH.value, bandH: grid.bandH.value, folded: grid.nightFolded.value === 1 }
  }

  /**
   * Déplacement en créneaux. On convertit une POSITION absolue plutôt que
   * d'appliquer un ratio au déplacement du doigt : sous une échelle repliée,
   * un même nombre de pixels ne vaut pas le même nombre de créneaux selon
   * qu'on est dans la journée ou dans la bande de nuit.
   */
  const dragSlots = useDerivedValue(() => {
    if (lifted.value === 0) return 0
    const s = scale()
    const dy = fingerDY.value + grid.scrollY.value - scrollAtStart.value
    const cible = clamp(
      Math.round(yToSlot(slotToY(window.startSlot, s) + dy, s)),
      0,
      SLOTS_PER_DAY - length,
    )
    return cible - window.startSlot
  })

  const dragDay = useDerivedValue(() => {
    if (lifted.value === 0 || grid.lockDay.value === 1) return window.day
    const x = grid.colLefts.value[window.day]! + grid.colWidths.value[window.day]! / 2 + fingerDX.value
    return dayAt(x, grid.colLefts.value, grid.colWidths.value)
  })

  const commitMove = (deltaSlots: number, deltaDays: number) => {
    actions.onCommit(event.id, moveWindow(window, deltaSlots, deltaDays))
    hapticDone()
  }
  const commitResize = (which: 1 | 2, delta: number) => {
    const next: SlotWindow = which === 1 ? resizeStart(window, delta) : resizeEnd(window, delta)
    actions.onCommit(event.id, next)
    hapticDone()
  }
  const select = () => actions.onSelect(event.id)

  /**
   * Démontage en plein geste — changer de jour pendant un glissé remonte toute
   * la colonne. Gesture Handler supprime alors le handler natif sans délivrer
   * d'état terminal : `onFinalize` n'est jamais appelé, et sans ce nettoyage
   * les verrous resteraient armés jusqu'au redémarrage (grille qui défile
   * seule, pager et pincement morts).
   */
  useEffect(
    () => () => {
      grid.dragActive.value = 0
      grid.gestureActive.value = 0
      grid.autoScroll.value = 0
    },
    [grid],
  )

  const drag = Gesture.Pan()
    .maxPointers(1)
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      lifted.value = 1
      grid.dragActive.value = 1
      grid.gestureActive.value = 1
      fingerDX.value = 0
      fingerDY.value = 0
      scrollAtStart.value = grid.scrollY.value
      lastSnap.value = 0
      runOnJS(hapticLift)()
      runOnJS(select)()
    })
    .onUpdate((e) => {
      fingerDX.value = e.translationX
      fingerDY.value = e.translationY
      // auto-défilement près des bords du viewport
      const yInViewport = e.absoluteY - grid.viewportTop.value
      if (yInViewport < EDGE_AUTOSCROLL) {
        grid.autoScroll.value = -((EDGE_AUTOSCROLL - yInViewport) / EDGE_AUTOSCROLL) * 14
      } else if (yInViewport > grid.viewportHeight.value - EDGE_AUTOSCROLL) {
        grid.autoScroll.value = ((yInViewport - (grid.viewportHeight.value - EDGE_AUTOSCROLL)) / EDGE_AUTOSCROLL) * 14
      } else {
        grid.autoScroll.value = 0
      }
      const snap = dragSlots.value
      if (snap !== lastSnap.value) {
        lastSnap.value = snap
        runOnJS(hapticSelect)()
      }
    })
    .onFinalize(() => {
      const deltaSlots = dragSlots.value
      const deltaDays = dragDay.value - window.day
      grid.autoScroll.value = 0
      grid.dragActive.value = 0
      grid.gestureActive.value = 0
      lifted.value = 0
      fingerDX.value = 0
      fingerDY.value = 0
      if (deltaSlots !== 0 || deltaDays !== 0) runOnJS(commitMove)(deltaSlots, deltaDays)
    })

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(select)()
  })

  const handleGesture = (which: 1 | 2) =>
    Gesture.Pan()
      .maxPointers(1)
      .activateAfterLongPress(120)
      .onStart(() => {
        resizing.value = which
        grid.dragActive.value = 1
        grid.gestureActive.value = 1
        resizeDelta.value = 0
        lastSnap.value = 0
        runOnJS(hapticLift)()
      })
      .onUpdate((e) => {
        const s = scale()
        const bord = which === 1 ? window.startSlot : window.endSlot
        // même raison que pour le déplacement : on convertit une position
        const raw = Math.round(yToSlot(slotToY(bord, s) + e.translationY, s)) - bord
        resizeDelta.value =
          which === 1
            ? clamp(raw, -window.startSlot, length - 1)
            : clamp(raw, -(length - 1), SLOTS_PER_DAY - window.endSlot)
        if (resizeDelta.value !== lastSnap.value) {
          lastSnap.value = resizeDelta.value
          runOnJS(hapticSelect)()
        }
      })
      .onFinalize(() => {
        const delta = resizeDelta.value
        resizing.value = 0
        grid.dragActive.value = 0
        grid.gestureActive.value = 0
        resizeDelta.value = 0
        if (delta !== 0) runOnJS(commitResize)(which, delta)
      })

  const topHandle = useMemo(() => handleGesture(1), [window.startSlot, window.endSlot])
  const bottomHandle = useMemo(() => handleGesture(2), [window.startSlot, window.endSlot])

  const style = useAnimatedStyle(() => {
    const s = scale()
    const startDelta = resizing.value === 1 ? resizeDelta.value : 0
    const endDelta = resizing.value === 2 ? resizeDelta.value : 0
    const glisse = lifted.value ? dragSlots.value : 0
    const top = slotToY(window.startSlot + startDelta + glisse, s)
    const bas = slotToY(window.endSlot + endDelta + glisse, s)
    const day = dragDay.value

    // La largeur est TOUJOURS renvoyée, même au repos. Reanimated ne
    // réinitialise pas une propriété qui disparaît d'un style animé : une
    // carte en demi-colonne soulevée une fois gardait la pleine largeur
    // définitivement.
    const colW = grid.colWidths.value[day] ?? 0
    const voie = colW / columns
    const left = (lifted.value ? 0 : column * voie) + INSET + nested * NESTED_STEP
    const width = Math.max(8, (lifted.value ? colW : voie) - 2 * INSET - nested * NESTED_STEP)
    const dx = lifted.value ? grid.colLefts.value[day]! - grid.colLefts.value[window.day]! : 0

    return {
      top,
      // Minimum de 2 px, pas d'un créneau : dans la nuit repliée une carte ne
      // vaut que quelques pixels, et la forcer à la hauteur d'un créneau la
      // ferait dépasser de la bande, au beau milieu de la journée.
      height: Math.max(2, bas - top),
      left,
      width,
      transform: [{ translateX: dx }, { scale: withSpring(lifted.value ? 1.02 : 1, springs.firm) }],
      shadowOpacity: withSpring(lifted.value ? 0.18 : 0.06, springs.firm),
      elevation: lifted.value ? 8 : 1,
      zIndex: lifted.value || selected ? 20 : 1 + nested,
    }
  })

  const metaStyle = useAnimatedStyle(() => ({
    opacity: grid.slotH.value * length >= 28 ? 1 : 0,
  }))

  const bg =
    event.kind === 'nous'
      ? colors.accentSoft
      : event.kind === 'proposed'
        ? colors.plumSoft
        : tint(event.personColor ?? colors.sky)

  return (
    <GestureDetector gesture={Gesture.Race(drag, tap)}>
      <Animated.View
        accessibilityRole="button"
        accessibilityLabel={`${event.title}, ${formatRange(window)}`}
        style={[
          styles.block,
          { backgroundColor: bg },
          event.kind === 'proposed' && styles.proposed,
          selected && styles.selected,
          style,
        ]}
      >
        {selected && <Animated.Text style={styles.range}>{formatRange(window)}</Animated.Text>}
        <Text
          numberOfLines={1}
          style={[
            styles.title,
            event.kind === 'personal' ? styles.titlePerso : styles.titleNous,
            event.kind === 'proposed' && { color: colors.plumInk },
          ]}
        >
          {event.title}
        </Text>
        <Animated.Text numberOfLines={1} style={[styles.meta, metaStyle]}>
          {formatRange(window)}
        </Animated.Text>
        {selected && (
          <>
            <GestureDetector gesture={topHandle}>
              <View style={[styles.handleHit, styles.handleTop]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <View style={styles.handle} />
              </View>
            </GestureDetector>
            <GestureDetector gesture={bottomHandle}>
              <View style={[styles.handleHit, styles.handleBottom]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <View style={styles.handle} />
              </View>
            </GestureDetector>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  block: {
    position: 'absolute',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#40282e',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    overflow: 'visible',
  },
  proposed: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.plum },
  selected: { borderWidth: 1.5, borderColor: colors.accent, minHeight: HIT_MIN },
  title: { fontSize: 12.5, color: colors.ink },
  titlePerso: { fontFamily: fonts.sans, fontWeight: '600' },
  titleNous: { fontFamily: fonts.display, fontWeight: '500', fontSize: 13.5 },
  meta: { fontFamily: fonts.display, fontStyle: 'italic', fontSize: 11, color: colors.ink2 },
  range: {
    position: 'absolute',
    top: -18,
    left: 0,
    fontFamily: fonts.display,
    fontStyle: 'italic',
    fontSize: 11,
    color: colors.accentInk,
  },
  handleHit: {
    position: 'absolute',
    left: '50%',
    marginLeft: -22,
    width: 44,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleTop: { top: -14 },
  handleBottom: { bottom: -14 },
  handle: {
    width: 28,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.paper,
  },
})
