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
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { demoWeek, type DemoEvent } from '../data/demo'
import { DAYS_PER_WEEK, SLOTS_PER_DAY, clamp, type SlotWindow } from '../domain/time'
import { dateOf, isToday, longDate, monthLabel, todayIndex } from '../domain/dates'
import { phraseOfDay } from '../domain/phrase'
import { GridActionsContext, GridSharedContext, type GridShared } from '../grid/context'
import { DayColumn } from '../components/DayColumn'
import { DayStrip } from '../components/DayStrip'
import { FrameMeter } from '../components/FrameMeter'
import { GUTTER_W, SLOT_BASE_H, ZOOM_MAX, ZOOM_MIN, colors, fonts } from '../theme'

const HOURS = Array.from({ length: 24 }, (_, h) => h)
/** Course horizontale : engagement, puis validation du changement de jour. */
const PAGER_COMMIT = 60
const SWIPE_WEEK = 60

/**
 * La vue Jour, avec son bandeau de dates — la vue principale depuis l'ADR-010.
 *
 * La grille Semaine à sept colonnes a été jugée trop compacte sur un téléphone
 * réel : « faut cliquer sur un jour, genre on a tous les jours de la semaine et
 * quand on clique ça montre le jour ». Le bandeau porte la semaine ; le jour
 * tapé s'ouvre en pleine largeur. Les gestes du calendrier survivent tous, et
 * deviennent même plus faciles : une seule colonne, donc plus de déplacement
 * latéral à arbitrer, et des cartes assez larges pour qu'on lise les titres.
 */
export function DayScreen() {
  const insets = useSafeAreaInsets()
  const [weekOffset, setWeekOffset] = useState(0)
  const [day, setDay] = useState(todayIndex)
  const [events, setEvents] = useState<DemoEvent[]>(() => demoWeek(0))
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
  const focusDay = useSharedValue(0)
  const focusW = useSharedValue(0)
  const narrowW = useSharedValue(0)
  const lockDay = useSharedValue(1)
  const pinchBase = useSharedValue(SLOT_BASE_H)
  const pinchFocalY = useSharedValue(0)
  const pinchScroll = useSharedValue(0)
  const pageX = useSharedValue(0)

  const scrollRef = useAnimatedRef<Animated.ScrollView>()

  // Une seule colonne, pleine largeur : les sept entrées valent toutes la même
  // chose, si bien qu'un bloc soulevé garde sa largeur et ne dérive jamais.
  useEffect(() => {
    if (gridWidth === 0) return
    focusW.value = gridWidth
    narrowW.value = gridWidth
    focusDay.value = day
    colLefts.value = Array.from({ length: DAYS_PER_WEEK }, () => 0)
    colWidths.value = Array.from({ length: DAYS_PER_WEEK }, () => gridWidth)
  }, [gridWidth, day, colLefts, colWidths, focusDay, focusW, narrowW])

  const shared = useMemo<GridShared>(
    () => ({ slotH, scrollY, colLefts, colWidths, gridPageX, viewportTop, viewportHeight, autoScroll, dragActive, focusDay, focusW, narrowW, lockDay }),
    [slotH, scrollY, colLefts, colWidths, gridPageX, viewportTop, viewportHeight, autoScroll, dragActive, focusDay, focusW, narrowW, lockDay],
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

  const selectDay = useCallback((d: number) => {
    setDay(clamp(d, 0, DAYS_PER_WEEK - 1))
    setSelectedId(null)
  }, [])

  /** Change de semaine et repart de sa démonstration. */
  const goWeek = useCallback((next: number) => {
    setWeekOffset(next)
    setEvents(demoWeek(next))
  }, [])

  /**
   * Au bout de la semaine, on continue : dimanche → lundi suivant. Le calcul
   * se fait sur les valeurs du rendu courant, jamais dans un `setState`
   * imbriqué — React rejoue les fonctions de mise à jour, et un décalage de
   * semaine compterait alors double.
   */
  const shiftDay = useCallback((dir: number) => {
    const next = day + dir
    if (next < 0) { goWeek(weekOffset - 1); setDay(DAYS_PER_WEEK - 1) }
    else if (next > DAYS_PER_WEEK - 1) { goWeek(weekOffset + 1); setDay(0) }
    else setDay(next)
    setSelectedId(null)
  }, [day, weekOffset, goWeek])

  const shiftWeek = useCallback((delta: number) => {
    goWeek(weekOffset + delta)
    setSelectedId(null)
  }, [weekOffset, goWeek])

  const goToday = useCallback(() => {
    goWeek(0)
    setDay(todayIndex())
    setSelectedId(null)
  }, [goWeek])

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y },
  })

  // auto-défilement pendant un drag près des bords
  useFrameCallback(() => {
    const v = autoScroll.value
    if (v === 0) return
    const max = Math.max(0, SLOTS_PER_DAY * slotH.value - viewportHeight.value)
    scrollTo(scrollRef, 0, clamp(scrollY.value + v, 0, max), false)
  })

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

  // pager : la page suit le doigt à moitié, et bascule au-delà du seuil
  const pager = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onUpdate((e) => {
      if (dragActive.value === 1) return
      pageX.value = e.translationX * 0.5
    })
    .onEnd((e) => {
      if (dragActive.value === 1) return
      if (e.translationX < -PAGER_COMMIT) runOnJS(shiftDay)(1)
      else if (e.translationX > PAGER_COMMIT) runOnJS(shiftDay)(-1)
    })
    .onFinalize(() => {
      pageX.value = withTiming(0, { duration: 220 })
    })
  const gridGesture = Gesture.Race(pager, Gesture.Simultaneous(native, pinch))

  // le bandeau, lui, change de semaine
  const stripPan = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onEnd((e) => {
      if (e.translationX < -SWIPE_WEEK) runOnJS(shiftWeek)(1)
      else if (e.translationX > SWIPE_WEEK) runOnJS(shiftWeek)(-1)
    })

  const gridRef = useRef<View>(null)
  const onGridLayout = (e: LayoutChangeEvent) => {
    setGridWidth(e.nativeEvent.layout.width - GUTTER_W - 16)
    viewportHeight.value = e.nativeEvent.layout.height
    gridRef.current?.measureInWindow((x, y) => {
      gridPageX.value = x + 8 + GUTTER_W
      viewportTop.value = y
    })
  }

  const contentHeight = useAnimatedStyle(() => ({ height: SLOTS_PER_DAY * slotH.value }))
  const pageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pageX.value }],
    opacity: 1 - Math.min(0.4, Math.abs(pageX.value) / 160),
  }))

  const date = dateOf(weekOffset, day)
  const today = isToday(date)
  const dayEvents = useMemo(() => events.filter((e) => e.window.day === day), [events, day])
  const phrase = useMemo(() => phraseOfDay(dayEvents.map((e) => e.window)), [dayEvents])

  const now = new Date()
  const nowPct = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100

  return (
    <GridSharedContext.Provider value={shared}>
      <GridActionsContext.Provider value={actions}>
        <View style={[styles.screen, { paddingTop: insets.top }]}>
          <View style={styles.titleRow}>
            <Text style={styles.month}>{monthLabel(date)}</Text>
            <FrameMeter />
          </View>

          <GestureDetector gesture={stripPan}>
            <View>
              <DayStrip weekOffset={weekOffset} day={day} events={events} onSelect={selectDay} />
            </View>
          </GestureDetector>

          <Pressable style={styles.dayTitle} onPress={goToday} disabled={today} accessibilityRole="button">
            <Text style={styles.dt}>{today ? "aujourd'hui" : longDate(date)}</Text>
            <Text style={styles.ph}>{phrase}</Text>
            {!today && <Text style={styles.back}>revenir à aujourd'hui</Text>}
          </Pressable>

          <View style={styles.grid} onLayout={onGridLayout} ref={gridRef}>
            <GestureDetector gesture={gridGesture}>
              <Animated.ScrollView
                ref={scrollRef}
                onScroll={onScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentOffset={{ x: 0, y: 7 * 2 * SLOT_BASE_H }}
              >
                <Animated.View style={[styles.content, contentHeight, pageStyle]}>
                  <View style={styles.gutter}>
                    {HOURS.map((h) => (
                      <View key={h} style={[styles.hour, { top: `${(h / 24) * 100}%` }]}>
                        <Text style={styles.hourText}>{h} h</Text>
                        <View style={styles.hourTick} />
                      </View>
                    ))}
                  </View>
                  <View style={styles.columns}>
                    <DayColumn key={day} day={day} events={dayEvents} selectedId={selectedId} isToday={today} />
                    {today && (
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
  month: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, letterSpacing: -0.3 },
  dayTitle: { alignItems: 'center', paddingTop: 4, paddingBottom: 8, paddingHorizontal: 12, gap: 1 },
  dt: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  ph: { fontFamily: fonts.display, fontStyle: 'italic', fontSize: 13.5, color: colors.ink2 },
  back: { fontFamily: fonts.sans, fontSize: 11, color: colors.accentInk, marginTop: 2 },
  grid: { flex: 1, paddingHorizontal: 8 },
  content: { flexDirection: 'row' },
  gutter: { width: GUTTER_W },
  hour: { position: 'absolute', right: 0, left: 0, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end' },
  hourText: { fontFamily: fonts.display, fontSize: 12, color: colors.ink2, marginTop: -8, marginRight: 4, fontVariant: ['tabular-nums'] },
  hourTick: { width: 8, height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong },
  columns: { flex: 1, flexDirection: 'row' },
  nowLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.accent },
  nowHeart: { position: 'absolute', left: 6, top: -9, color: colors.accent, fontSize: 12 },
})
