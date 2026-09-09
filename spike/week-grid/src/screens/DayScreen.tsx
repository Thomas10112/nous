import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { demoWeek, type DemoEvent } from '../data/demo'
import {
  DAYS_PER_WEEK,
  NIGHT_END,
  NIGHT_START,
  SLOTS_PER_DAY,
  clamp,
  dayHeight,
  slotToY,
  yToSlot,
  type DayScale,
  type SlotWindow,
} from '../domain/time'
import { dateOf, isToday, longDate, monthLabel, todayIndex } from '../domain/dates'
import { phraseOfDay } from '../domain/phrase'
import { GridActionsContext, GridSharedContext, useGridShared, type GridShared } from '../grid/context'
import { DayColumn } from '../components/DayColumn'
import { DayStrip } from '../components/DayStrip'
import { FrameMeter } from '../components/FrameMeter'
import { BAND_H, GUTTER_W, SLOT_BASE_H, ZOOM_MAX, ZOOM_MIN, colors, fonts } from '../theme'

const HOURS = Array.from({ length: 24 }, (_, h) => h)
/** Course horizontale : au-delà, on change de jour. */
const PAGER_COMMIT = 60
const SWIPE_WEEK = 60
/** Largeur plausible avant la première mise en page — sinon la colonne s'ouvre à zéro. */
const FIRST_W = Dimensions.get('window').width - GUTTER_W - 16

/** Un repère d'heure, posé par l'échelle et effacé quand il tombe dans la nuit repliée. */
function HourMark({ hour }: { hour: number }) {
  const grid = useGridShared()
  const style = useAnimatedStyle(() => {
    const s: DayScale = {
      slotH: grid.slotH.value,
      bandH: grid.bandH.value,
      folded: grid.nightFolded.value === 1,
    }
    const dansLaNuit = s.folded && (hour * 2 < NIGHT_END || hour * 2 > NIGHT_START)
    return { top: slotToY(hour * 2, s), opacity: dansLaNuit ? 0 : 1 }
  })
  return (
    <Animated.View style={[styles.hour, style]} pointerEvents="none">
      <Text style={styles.hourText}>{hour} h</Text>
      <View style={styles.hourTick} />
    </Animated.View>
  )
}

/**
 * Une bande de nuit. Repliée, elle occupe 28 px et dit ce qu'elle cache ;
 * dépliée, elle s'efface et ne laisse qu'une étiquette pour se refermer, afin
 * de ne rien recouvrir de la grille.
 */
function NightBand({
  edge,
  folded,
  count,
  onToggle,
}: {
  edge: 'top' | 'bottom'
  folded: boolean
  count: number
  onToggle: () => void
}) {
  const grid = useGridShared()
  const style = useAnimatedStyle(() => {
    const s: DayScale = {
      slotH: grid.slotH.value,
      bandH: grid.bandH.value,
      folded: grid.nightFolded.value === 1,
    }
    const debut = edge === 'top' ? 0 : NIGHT_START
    const fin = edge === 'top' ? NIGHT_END : SLOTS_PER_DAY
    const top = slotToY(debut, s)
    return { top, height: slotToY(fin, s) - top }
  })
  const heures = edge === 'top' ? 'minuit → 7 h' : '23 h → minuit'
  return (
    <Animated.View
      style={[
        styles.band,
        folded ? styles.bandFolded : edge === 'top' ? styles.bandOpenTop : styles.bandOpenBottom,
        style,
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onToggle}
        style={styles.bandTap}
        accessibilityRole="button"
        accessibilityLabel={folded ? `Déplier la nuit, ${heures}` : 'Replier la nuit'}
      >
        <Text style={styles.bandText}>
          {folded ? `la nuit${count > 0 ? ` · ${count}` : ''}` : 'replier la nuit'}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

/**
 * La vue Jour, avec son bandeau de dates — la vue principale depuis l'ADR-010.
 *
 * La journée montrée va de 7 h à 23 h ; la nuit se replie en deux bandes
 * (parti pris n°5 du design system). Sans ce repli, la page s'ouvrait sur dix
 * heures de vide — ce que le couple a vu du premier coup d'œil.
 */
export function DayScreen() {
  const insets = useSafeAreaInsets()
  const [weekOffset, setWeekOffset] = useState(0)
  const [day, setDay] = useState(todayIndex)
  const [events, setEvents] = useState<DemoEvent[]>(() => demoWeek(0))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [gridWidth, setGridWidth] = useState(FIRST_W)
  const [folded, setFolded] = useState(true)

  const slotH = useSharedValue(SLOT_BASE_H)
  const scrollY = useSharedValue(0)
  const colLefts = useSharedValue<number[]>(() => new Array<number>(DAYS_PER_WEEK).fill(0))
  const colWidths = useSharedValue<number[]>(() => new Array<number>(DAYS_PER_WEEK).fill(FIRST_W))
  const gridPageX = useSharedValue(0)
  const viewportTop = useSharedValue(0)
  const viewportHeight = useSharedValue(0)
  const autoScroll = useSharedValue(0)
  const dragActive = useSharedValue(0)
  const gestureActive = useSharedValue(0)
  const nightFolded = useSharedValue(1)
  const bandH = useSharedValue(BAND_H)
  const focusDay = useSharedValue(0)
  const focusW = useSharedValue(FIRST_W)
  const narrowW = useSharedValue(FIRST_W)
  const lockDay = useSharedValue(1)
  const pinchBase = useSharedValue(SLOT_BASE_H)
  const pinchFocalY = useSharedValue(0)
  const pinchScroll = useSharedValue(0)
  const pageX = useSharedValue(0)

  const scrollRef = useAnimatedRef<Animated.ScrollView>()

  // Une seule colonne, pleine largeur : les sept entrées valent toutes la même
  // chose, si bien qu'un bloc soulevé garde sa largeur et ne dérive jamais.
  useEffect(() => {
    focusW.value = gridWidth
    narrowW.value = gridWidth
    focusDay.value = day
    colLefts.value = new Array<number>(DAYS_PER_WEEK).fill(0)
    colWidths.value = new Array<number>(DAYS_PER_WEEK).fill(gridWidth)
  }, [gridWidth, day, colLefts, colWidths, focusDay, focusW, narrowW])

  const shared = useMemo<GridShared>(
    () => ({
      slotH, scrollY, colLefts, colWidths, gridPageX, viewportTop, viewportHeight,
      autoScroll, dragActive, gestureActive, nightFolded, bandH, focusDay, focusW, narrowW, lockDay,
    }),
    [slotH, scrollY, colLefts, colWidths, gridPageX, viewportTop, viewportHeight,
     autoScroll, dragActive, gestureActive, nightFolded, bandH, focusDay, focusW, narrowW, lockDay],
  )

  const onCommit = useCallback((id: string, window: SlotWindow) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, window } : e)))
  }, [])
  const onSelect = useCallback((id: string | null) => setSelectedId(id), [])
  const onCreate = useCallback((window: SlotWindow) => {
    const id = `new-${window.day}-${window.startSlot}`
    setEvents((prev) => [...prev.filter((e) => e.id !== id), { id, title: 'Nouveau', kind: 'nous', window }])
    setSelectedId(id)
  }, [])
  const actions = useMemo(() => ({ onCommit, onSelect, onCreate }), [onCommit, onSelect, onCreate])

  const selectDay = useCallback((d: number) => {
    setDay(clamp(d, 0, DAYS_PER_WEEK - 1))
    setSelectedId(null)
  }, [])

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

  /**
   * Replier ou déplier la nuit sans que la page saute : on note l'instant qui
   * occupe le haut de l'écran, on change d'échelle, on le remet au même endroit.
   */
  const toggleNight = useCallback(() => {
    const avant: DayScale = { slotH: slotH.value, bandH: BAND_H, folded: nightFolded.value === 1 }
    const repere = yToSlot(scrollY.value, avant)
    const apres: DayScale = { ...avant, folded: !avant.folded }
    nightFolded.value = apres.folded ? 1 : 0
    setFolded(apres.folded)
    const y = Math.max(0, slotToY(repere, apres))
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y, animated: false }))
  }, [slotH, nightFolded, scrollY, scrollRef])

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y },
    // Le défilement fait partie de ce que la phase 1 juge : il doit armer le
    // compteur, sinon un balayage se solde par « 0/0 », qui se lit à tort
    // « aucune image longue ».
    onBeginDrag: () => { gestureActive.value = 1 },
    onEndDrag: (e) => {
      if (dragActive.value === 0 && Math.abs(e.velocity?.y ?? 0) < 0.1) gestureActive.value = 0
    },
    onMomentumEnd: () => { if (dragActive.value === 0) gestureActive.value = 0 },
  })

  // Auto-défilement pendant un drag. Inactif au repos : l'instrument ne doit
  // pas consommer le budget par image qu'il sert à mesurer.
  const auto = useFrameCallback(() => {
    const v = autoScroll.value
    if (v === 0) return
    const max = Math.max(0, dayHeight({ slotH: slotH.value, bandH: bandH.value, folded: nightFolded.value === 1 }) - viewportHeight.value)
    scrollTo(scrollRef, 0, clamp(scrollY.value + v, 0, max), false)
  }, false)

  // On extrait la fonction plutôt que de capturer l'objet : un worklet ne
  // referme proprement que sur des valeurs et des fonctions, pas sur un objet
  // qui en contient.
  const setAuto = auto.setActive
  useAnimatedReaction(
    () => dragActive.value === 1,
    (on, prev) => { if (on !== prev) runOnJS(setAuto)(on) },
  )

  const native = Gesture.Native()
  const pinch = Gesture.Pinch()
    .simultaneousWithExternalGesture(native)
    .onStart((e) => {
      pinchBase.value = slotH.value
      pinchFocalY.value = e.focalY
      pinchScroll.value = scrollY.value
      gestureActive.value = 1
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
    .onFinalize(() => { if (dragActive.value === 0) gestureActive.value = 0 })

  // pager : la page suit le doigt à moitié, et bascule au-delà du seuil
  const pager = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onStart(() => { gestureActive.value = 1 })
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
      if (dragActive.value === 0) gestureActive.value = 0
    })
  const gridGesture = Gesture.Race(pager, Gesture.Simultaneous(native, pinch))

  // le bandeau, lui, change de semaine
  const stripPan = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onStart(() => { gestureActive.value = 1 })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_WEEK) runOnJS(shiftWeek)(1)
      else if (e.translationX > SWIPE_WEEK) runOnJS(shiftWeek)(-1)
    })
    .onFinalize(() => { gestureActive.value = 0 })

  const gridRef = useRef<View>(null)
  const onGridLayout = (e: LayoutChangeEvent) => {
    setGridWidth(e.nativeEvent.layout.width - GUTTER_W - 16)
    viewportHeight.value = e.nativeEvent.layout.height
    gridRef.current?.measureInWindow((x, y) => {
      gridPageX.value = x + 8 + GUTTER_W
      viewportTop.value = y
    })
  }

  const contentHeight = useAnimatedStyle(() => ({
    height: dayHeight({ slotH: slotH.value, bandH: bandH.value, folded: nightFolded.value === 1 }),
  }))
  const pageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pageX.value }],
    opacity: 1 - Math.min(0.4, Math.abs(pageX.value) / 160),
  }))

  const date = dateOf(weekOffset, day)
  const today = isToday(date)
  const dayEvents = useMemo(() => events.filter((e) => e.window.day === day), [events, day])
  const phrase = useMemo(() => phraseOfDay(dayEvents.map((e) => e.window)), [dayEvents])
  const nuitMatin = useMemo(() => dayEvents.filter((e) => e.window.endSlot <= NIGHT_END).length, [dayEvents])
  const nuitSoir = useMemo(() => dayEvents.filter((e) => e.window.startSlot >= NIGHT_START).length, [dayEvents])

  const now = new Date()
  const nowSlot = (now.getHours() * 60 + now.getMinutes()) / 30
  const nowStyle = useAnimatedStyle(() => ({
    top: slotToY(nowSlot, { slotH: slotH.value, bandH: bandH.value, folded: nightFolded.value === 1 }),
  }))

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
              <Animated.ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
                <Animated.View style={[styles.content, contentHeight, pageStyle]}>
                  <View style={styles.gutter}>
                    {HOURS.map((h) => (
                      <HourMark key={h} hour={h} />
                    ))}
                  </View>
                  <View style={styles.columns}>
                    <DayColumn key={day} day={day} events={dayEvents} selectedId={selectedId} isToday={today} />
                    <NightBand edge="top" folded={folded} count={nuitMatin} onToggle={toggleNight} />
                    <NightBand edge="bottom" folded={folded} count={nuitSoir} onToggle={toggleNight} />
                    {today && (
                      <Animated.View pointerEvents="none" style={[styles.nowLine, nowStyle]}>
                        <View style={styles.nowDot} />
                      </Animated.View>
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
  band: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  // La bande repliée doit couvrir ce qu'elle résume : sur Android une carte
  // porte une élévation, qui la ferait passer au-dessus d'un simple frère.
  bandFolded: {
    backgroundColor: colors.surface3,
    justifyContent: 'center',
    zIndex: 30,
    elevation: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  // dépliée, la bande ne peint rien : elle range juste son étiquette contre la journée
  bandOpenTop: { justifyContent: 'flex-end' },
  bandOpenBottom: { justifyContent: 'flex-start' },
  bandTap: { minHeight: 28, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  bandText: { fontFamily: fonts.display, fontStyle: 'italic', fontSize: 11.5, color: colors.ink3 },
  nowLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.accent },
  nowDot: { position: 'absolute', left: 2, top: -3, width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.accent },
})
