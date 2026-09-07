import React from 'react'
import { StyleSheet, TextInput } from 'react-native'
import Animated, { useAnimatedProps, useFrameCallback, useSharedValue } from 'react-native-reanimated'
import { colors, fonts } from '../theme'
import { useGridShared } from '../grid/context'

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput)

/**
 * Compteur de frames longues pendant un geste, sans passer par le thread JS.
 *
 * Le budget par frame dépend de l'écran, pas d'une constante : 16,7 ms à 60 Hz,
 * mais 8,3 ms sur le Galaxy S24 Ultra du couple, dont la dalle monte à 120 Hz.
 * On mesure donc la cadence au repos (plus petit intervalle observé, arrondi à
 * une fréquence usuelle) et on compte ce qui dépasse ce budget de moitié.
 */
export function FrameMeter() {
  const { dragActive } = useGridShared()
  const frames = useSharedValue(0)
  const long = useSharedValue(0)
  const worst = useSharedValue(0)
  const wasActive = useSharedValue(0)
  /** Intervalle le plus court observé : la cadence réelle de l'écran. */
  const shortest = useSharedValue(100)
  const hz = useSharedValue(0)

  useFrameCallback((info) => {
    const dt = info.timeSincePreviousFrame ?? 0

    // calibrage permanent : le plus court intervalle vu jusqu'ici
    if (dt > 1 && dt < shortest.value) {
      shortest.value = dt
      const raw = 1000 / dt
      // on se cale sur la fréquence usuelle la plus proche
      hz.value = [60, 90, 120, 144].reduce(
        (best, c) => (Math.abs(c - raw) < Math.abs(best - raw) ? c : best),
        60,
      )
    }
    const budget = hz.value > 0 ? 1000 / hz.value : 16.7

    if (dragActive.value === 1) {
      if (wasActive.value === 0) {
        frames.value = 0
        long.value = 0
        worst.value = 0
        wasActive.value = 1
      }
      frames.value += 1
      if (dt > budget * 1.5) long.value += 1
      if (dt > worst.value) worst.value = dt
    } else {
      wasActive.value = 0
    }
  })

  const props = useAnimatedProps(() => ({
    text:
      `${hz.value || '…'} Hz · ${long.value}/${frames.value} > ` +
      `${(hz.value > 0 ? 1000 / hz.value : 16.7).toFixed(1)} ms · pire ${worst.value.toFixed(0)}`,
    defaultValue: '',
  }))

  return (
    <AnimatedTextInput
      editable={false}
      animatedProps={props}
      style={styles.meter}
      underlineColorAndroid="transparent"
    />
  )
}

const styles = StyleSheet.create({
  meter: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.ink2,
    paddingVertical: 2,
    paddingHorizontal: 10,
    backgroundColor: colors.surface3,
    borderRadius: 999,
    fontVariant: ['tabular-nums'],
  },
})
