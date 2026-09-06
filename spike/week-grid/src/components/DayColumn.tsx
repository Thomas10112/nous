import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import type { DemoEvent } from '../data/demo'
import { layoutDay } from '../domain/layout'
import { SLOTS_PER_DAY, clamp, slotAt, snapSlot } from '../domain/time'
import { useGridActions, useGridShared } from '../grid/context'
import { LONG_PRESS_MS, colors, springs } from '../theme'
import { EventBlock } from './EventBlock'

interface Props {
  day: number
  events: DemoEvent[]
  selectedId: string | null
  isToday: boolean
}

const hapticSelect = () => void Haptics.selectionAsync()
const hapticLift = () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

/** Largeur animée d'une colonne : focus 2,6 parts, les autres 0,73 (spring « firm »). */
export function useColumnStyle(day: number) {
  const { focusDay, focusW, narrowW } = useGridShared()
  return useAnimatedStyle(() => ({
    width: withSpring(focusDay.value === day ? focusW.value : narrowW.value, springs.firm),
  }))
}

/**
 * Une colonne de jour : papier grainé sans réglure, fond qui reçoit le
 * long-press de création (fantôme de 2 créneaux que l'on étire) et le tap
 * qui désélectionne ; les blocs sont posés par-dessus.
 */
export function DayColumn({ day, events, selectedId, isToday }: Props) {
  const grid = useGridShared()
  const actions = useGridActions()
  const widthStyle = useColumnStyle(day)

  const ghostOn = useSharedValue(0)
  const ghostStart = useSharedValue(0)
  const ghostEnd = useSharedValue(2)
  const lastSnap = useSharedValue(0)

  const create = (startSlot: number, endSlot: number) => actions.onCreate({ day, startSlot, endSlot })
  const deselect = () => actions.onSelect(null)

  const createGesture = Gesture.Pan()
    .maxPointers(1)
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart((e) => {
      const start = slotAt(e.y, grid.slotH.value)
      ghostStart.value = start
      ghostEnd.value = Math.min(SLOTS_PER_DAY, start + 2)
      lastSnap.value = ghostEnd.value
      ghostOn.value = 1
      grid.dragActive.value = 1
      runOnJS(hapticLift)()
      runOnJS(deselect)()
    })
    .onUpdate((e) => {
      const end = clamp(snapSlot(e.y, grid.slotH.value), ghostStart.value + 1, SLOTS_PER_DAY)
      ghostEnd.value = end
      if (end !== lastSnap.value) {
        lastSnap.value = end
        runOnJS(hapticSelect)()
      }
    })
    .onFinalize((_e, success) => {
      const start = ghostStart.value
      const end = ghostEnd.value
      ghostOn.value = 0
      grid.dragActive.value = 0
      if (success) runOnJS(create)(start, end)
    })

  const tapBackground = Gesture.Tap().onEnd(() => {
    runOnJS(deselect)()
  })

  const ghostStyle = useAnimatedStyle(() => ({
    opacity: ghostOn.value,
    top: ghostStart.value * grid.slotH.value,
    height: (ghostEnd.value - ghostStart.value) * grid.slotH.value,
  }))

  const placements = useMemo(() => {
    const map = new Map<string, { column: number; columns: number; nested: number }>()
    for (const p of layoutDay(events.map((e) => ({ id: e.id, ...e.window })))) {
      map.set(p.id, { column: p.column, columns: p.columns, nested: p.nested })
    }
    return map
  }, [events])

  const heightStyle = useAnimatedStyle(() => ({ height: SLOTS_PER_DAY * grid.slotH.value }))

  return (
    <Animated.View style={[styles.column, widthStyle, heightStyle, isToday && styles.today]}>
      <GestureDetector gesture={Gesture.Race(createGesture, tapBackground)}>
        <View style={StyleSheet.absoluteFill} accessible={false} />
      </GestureDetector>
      <Animated.View pointerEvents="none" style={[styles.ghost, ghostStyle]} />
      {events.map((event) => {
        const p = placements.get(event.id) ?? { column: 0, columns: 1, nested: 0 }
        return (
          <EventBlock
            key={event.id}
            event={event}
            selected={selectedId === event.id}
            column={p.column}
            columns={p.columns}
            nested={p.nested}
          />
        )
      })}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  column: {
    backgroundColor: colors.surface2,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.line,
  },
  today: { backgroundColor: colors.bgTint },
  ghost: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
})
