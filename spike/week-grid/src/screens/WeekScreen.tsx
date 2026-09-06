import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DAY_LABELS, demoWeek, type DemoEvent } from '../data/demo'
import { DAYS_PER_WEEK, SLOTS_PER_DAY, clamp, type SlotWindow } from '../domain/time'
import { GridActionsContext, GridSharedContext, type GridShared } from '../grid/context'
import { DayColumn, useColumnStyle } from '../components/DayColumn'
import { FrameMeter } from '../components/FrameMeter'
import { GUTTER_W, SLOT_BASE_H, ZOOM_MAX, ZOOM_MIN, colors, fonts, springs } from '../theme'

const HOURS = Array.from({ length: 24 }, (_, h) => h)
const TODAY_INDEX = ((new Date().getDay() + 6) % 7) // lundi = 0

function DayHeader({ day, focused, isToday, onPress }: { day: number; focused: boolean; isToday: boolean; onPress: () => void }) {
  const widthStyle = useColumnStyle(day)
  return (
    <Animated.View style={[styles.headerCell, widthStyle]}>
      <Pressable onPress={onPress} style={styles.headerPress} accessibilityRole="button" accessibilityLabel={DAY_LABELS[day]}>
        <Text style={[styles.headerDay, focused && styles.headerDayFocus]} numberOfLines={1}>
          {focused ? DAY_LABELS[day] : DAY_LABELS[day]!.slice(0, 1)}
        </Text>
        <Text style={[styles.headerNum, focused && styles.headerNumFocus]}>{8 + day}</Text>
        {isToday && <Text style={styles.heart}>♥</Text>}
      </Pressable>
    </Animated.View>
  )
}

/**
 * Le spike : vue Semaine 48 × 7, colonne focus en portrait, scroll vertical,
 * long-press → drag → accrochage 30 min, poignées, pinch de hauteur de
 * créneau avec point focal conservé, auto-défilement au bord, pager horizontal.
 */
export function WeekScreen() {
  const insets = useSafeAreaInsets()
  const [weekOffset, setWeekOffset] = useState(0)
  const [events, setEvents] = useState<DemoEvent[]>(() => demoWeek(0))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusDayState, setFocusDayState] = useState(TODAY_INDEX)
  const [gridWidth, setGridWidth] = useState(0)

  const slotH = useSharedValue(SLOT_BASE_H)
  const scrollY = useSharedValue(0)
  const colLefts = useSharedValue<number[]>([0, 0, 0, 0, 0, 0, 0])
  const colWidths = useSharedValue<number[]>([0, 0, 0, 0, 0, 0, 0])
  const gridPageX = useSharedValue(0)
  const viewportTop = useSharedValue(0)
  const viewportHeight = useSharedValue(0)
  const autoScroll = useSharedValue(0)
  const dragActive = useSharedValue(0)
  const focusDay = useSharedValue(TODAY_INDEX)
  const focusW = useSharedValue(0)
  const narrowW = useSharedValue(0)
  const pinchBase = useSharedValue(SLOT_BASE_H)
  const pinchFocalY = useSharedValue(0)
  const pinchScroll = useSharedValue(0)

  const scrollRef = useAnimatedRef<Animated.ScrollView>()

  // largeurs de colonnes : focus 2,6 parts, six autres 0,73 (05 §4 / 06 §4)
  useEffect(() => {
    if (gridWidth === 0) return
    const parts = 2.6 + 6 * 0.73
    const fw = (gridWidth * 2.6) / parts
    const nw = (gridWidth * 0.73) / parts
    focusW.value = fw
    narrowW.value = nw
    focusDay.value = focusDayState
    const lefts: number[] = []
    const widths: number[] = []
    let x = 0
    for (let d = 0; d < DAYS_PER_WEEK; d += 1) {
      const w = d === focusDayState ? fw : nw
      lefts.push(x)
      widths.push(w)
      x += w
    }
    colLefts.value = lefts
    colWidths.value = widths
  }, [gridWidth, focusDayState, colLefts, colWidths, focusDay, focusW, narrowW])

  const shared = useMemo<GridShared>(
    () => ({ slotH, scrollY, colLefts, colWidths, gridPageX, viewportTop, viewportHeight, autoScroll, dragActive, focusDay, focusW, narrowW }),
    [slotH, scrollY, colLefts, colWidths, gridPageX, viewportTop, viewportHeight, autoScroll, dragActive, focusDay, focusW, narrowW],
  )

  const onCommit = useCallback((id: string, window: SlotWindow) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, window } : e)))
  }, [])
  const onSelect = useCallback((id: string | null) => setSelectedId(id), [])
  const onCreate = useCallback((window: SlotWindow) => {
    const id = `new-${Date.now()}`
    setEvents((prev) => [...prev, { id, title: 'Nouveau', kind: 'nous', window }])
    setSelectedId(id)
  }, [])
  const actions = useMemo(() => ({ onCommit, onSelect, onCreate }), [onCommit, onSelect, onCreate])

  const shiftWeek = useCallback((delta: number) => {
    setWeekOffset((w) => {
      const next = w + delta
      setEvents(demoWeek(next))
      return next
    })
    setSelectedId(null)
  }, [])

  // défilement
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y
    },
  })

  // auto-défilement pendant un drag près des bords
  useFrameCallback(() => {
    const v = autoScroll.value
    if (v === 0) return
    const max = Math.max(0, SLOTS_PER_DAY * slotH.value - viewportHeight.value)
    scrollTo(scrollRef, 0, clamp(scrollY.value + v, 0, max), false)
  })

  // gestes de la grille : scroll natif ∥ pinch ; pager horizontal en course
  const native = Gesture.Native()
  const pinch = Gesture.Pinch()
    .simultaneousWithExternalGesture(native)
    .onStart((e) => {
      pinchBase.value = slotH.value
      pinchFocalY.value = e.focalY
      pinchScroll.value = scrollY.value
    })
    .onUpdate((e) => {
      if (dragActive.value === 1) return
      const next = clamp(pinchBase.value * e.scale, SLOT_BASE_H * ZOOM_MIN, SLOT_BASE_H * ZOOM_MAX)
      const ratio = next / pinchBase.value
      slotH.value = next
      // le créneau sous les doigts reste sous les doigts
      const contentBefore = pinchScroll.value + pinchFocalY.value
      scrollTo(scrollRef, 0, Math.max(0, contentBefore * ratio - pinchFocalY.value), false)
    })
  const weekPan = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onEnd((e) => {
      if (dragActive.value === 1) return
      if (e.translationX < -60) runOnJS(shiftWeek)(1)
      else if (e.translationX > 60) runOnJS(shiftWeek)(-1)
    })
  const gridGesture = Gesture.Race(weekPan, Gesture.Simultaneous(native, pinch))

  const gridRef = useRef<View>(null)
  const onGridLayout = (e: LayoutChangeEvent) => {
    setGridWidth(e.nativeEvent.layout.width - GUTTER_W - 16)
    viewportHeight.value = e.nativeEvent.layout.height
    // origine de la grille dans la fenêtre : pour absoluteX/absoluteY des gestes
    gridRef.current?.measureInWindow((x, y) => {
      gridPageX.value = x + 8 + GUTTER_W
      viewportTop.value = y
    })
  }

  const contentHeight = useAnimatedStyle(() => ({ height: SLOTS_PER_DAY * slotH.value }))

  const now = new Date()
  const nowPct = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100

  const byDay = useMemo(() => {
    const map: DemoEvent[][] = Array.from({ length: DAYS_PER_WEEK }, () => [])
    for (const e of events) map[e.window.day]!.push(e)
    return map
  }, [events])

  return (
    <GridSharedContext.Provider value={shared}>
      <GridActionsContext.Provider value={actions}>
        <View style={[styles.screen, { paddingTop: insets.top }]}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>septembre 2026</Text>
            <View style={styles.titleRight}>
              <Text style={styles.weekLabel}>semaine {weekOffset >= 0 ? `+${weekOffset}` : weekOffset}</Text>
              <FrameMeter />
            </View>
          </View>

          <View style={styles.headerRow}>
            <View style={{ width: GUTTER_W }} />
            {HOURS.slice(0, DAYS_PER_WEEK).map((_, day) => (
              <DayHeader
                key={day}
                day={day}
                focused={focusDayState === day}
                isToday={day === TODAY_INDEX && weekOffset === 0}
                onPress={() => setFocusDayState(day)}
              />
            ))}
          </View>

          <View style={styles.grid} onLayout={onGridLayout} ref={gridRef}>
            <GestureDetector gesture={gridGesture}>
              <Animated.ScrollView
                ref={scrollRef}
                onScroll={onScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentOffset={{ x: 0, y: 7 * 2 * SLOT_BASE_H }}
              >
                <Animated.View style={[styles.content, contentHeight]}>
                  <View style={styles.gutter}>
                    {HOURS.map((h) => (
                      <View key={h} style={[styles.hour, { top: `${(h / 24) * 100}%` }]}>
                        <Text style={styles.hourText}>{h} h</Text>
                        <View style={styles.hourTick} />
                      </View>
                    ))}
                  </View>
                  <View style={styles.columns}>
                    {byDay.map((dayEvents, day) => (
                      <DayColumn
                        key={day}
                        day={day}
                        events={dayEvents}
                        selectedId={selectedId}
                        isToday={day === TODAY_INDEX && weekOffset === 0}
                      />
                    ))}
                    {weekOffset === 0 && (
                      <View pointerEvents="none" style={[styles.nowLine, { top: `${nowPct}%` }]}>
                        <Text style={styles.nowHeart}>♥</Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              </Animated.ScrollView>
            </GestureDetector>
          </View>
        </View>
      </GridActionsContext.Provider>
    </GridSharedContext.Provider>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, letterSpacing: -0.3 },
  titleRight: { alignItems: 'flex-end', gap: 4 },
  weekLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.ink2 },
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    backgroundColor: colors.bg,
  },
  headerCell: { alignItems: 'center' },
  headerPress: { alignItems: 'center', paddingVertical: 6, minHeight: 48, justifyContent: 'center', width: '100%' },
  headerDay: { fontFamily: fonts.sans, fontSize: 11, color: colors.ink2 },
  headerDayFocus: { color: colors.ink, fontWeight: '600' },
  headerNum: { fontFamily: fonts.display, fontSize: 17, color: colors.ink2, fontVariant: ['tabular-nums'] },
  headerNumFocus: { color: colors.ink, fontSize: 20 },
  heart: { color: colors.accent, fontSize: 9, marginTop: -2 },
  grid: { flex: 1, paddingHorizontal: 8 },
  content: { flexDirection: 'row' },
  gutter: { width: GUTTER_W },
  hour: { position: 'absolute', right: 0, left: 0, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end' },
  hourText: { fontFamily: fonts.display, fontSize: 12, color: colors.ink2, marginTop: -8, marginRight: 4, fontVariant: ['tabular-nums'] },
  hourTick: { width: 8, height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong, marginTop: 0 },
  columns: { flex: 1, flexDirection: 'row' },
  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.accent,
  },
  nowHeart: { position: 'absolute', left: 6, top: -9, color: colors.accent, fontSize: 12 },
})
