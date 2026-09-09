import React from 'react'
import { View } from 'react-native'

/**
 * Un cœur DESSINÉ, jamais écrit.
 *
 * Sur un vrai S24 Ultra, `♥` (U+2665) sort en rouge vif : la police du système
 * ne contient pas ce caractère, Android va le chercher dans la police d'emojis,
 * qui le dessine en couleur et ignore le `color` demandé. La capture du couple
 * le prouve deux fois — le cœur creux `♡` de la proposition, lui, sort bien en
 * mauve, parce qu'il n'est PAS dans la police d'emojis.
 *
 * Deux disques et un triangle : aucune police, donc aucune surprise, et la
 * couleur est exactement celle de la palette sur les deux téléphones.
 */
export function Heart({ size, color }: { size: number; color: string }) {
  const lobe = size * 0.58
  const lobeTop = size * 0.06
  const pointeTop = size * 0.35
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: lobeTop,
          width: lobe,
          height: lobe,
          borderRadius: lobe / 2,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: lobeTop,
          width: lobe,
          height: lobe,
          borderRadius: lobe / 2,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: pointeTop,
          width: 0,
          height: 0,
          borderLeftWidth: size / 2,
          borderRightWidth: size / 2,
          borderTopWidth: size - pointeTop,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
        }}
      />
    </View>
  )
}
