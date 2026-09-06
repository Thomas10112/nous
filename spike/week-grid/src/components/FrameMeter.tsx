import React from 'react'
import { StyleSheet, TextInput } from 'react-native'
import Animated, { useAnimatedProps, useFrameCallback, useSharedValue } from 'react-native-reanimated'
import { colors, fonts } from '../theme'
import { useGridShared } from '../grid/context'

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput)

/**
 * Compteur de frames longues pendant un geste, sans passer par le thread JS :
 * le critère du spike est « 0 frame > 16 ms pendant le drag ».
 */
export function FrameMeter() {
  const { dragActive } = useGridShared()
  const frames = useSharedValue(0)
  const long = useSharedValue(0)
  const wasActive = useSharedValue(0)

  useFrameCallback((info) => {
    if (dragActive.value === 1) {
      if (wasActive.value === 0) {
        frames.value = 0
        long.value = 0
        wasActive.value = 1
      }
      frames.value += 1
      const dt = info.timeSincePreviousFrame ?? 0
      if (dt > 17) long.value += 1
    } else {
      wasActive.value = 0
    }
  })

  const props = useAnimatedProps(() => ({
    text: `${long.value} longue(s) / ${frames.value} frames`,
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
