import React from 'react'
import { StyleSheet, TextInput } from 'react-native'
import Animated, { useAnimatedProps, useFrameCallback, useSharedValue } from 'react-native-reanimated'
import { colors, fonts } from '../theme'
import { useGridShared } from '../grid/context'

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput)

/* ------------------------------------------------------------------
   L'estimateur de cadence.

   La version précédente retenait le PLUS COURT intervalle jamais observé et
   le collait sur la plus proche de {60, 90, 120, 144}. Sur le téléphone du
   couple elle a annoncé « 144 Hz · budget 6,9 ms » alors que la dalle du S24
   Ultra plafonne à 120 Hz : une seule image aberrante entre 1 et 7,6 ms
   suffisait à verrouiller la valeur pour toute la session, et 144 étant le
   maximum de la liste, n'importe quel hoquet d'horloge y atterrissait.

   Ici, aucune liste de fréquences : on mesure une période en millisecondes,
   par vote majoritaire. Une valeur ne l'emporte que si elle REVIENT ; un
   échantillon isolé, si extrême soit-il, ne peut jamais décider. Et l'on ne
   calibre que pendant un geste : le S24 Ultra est une dalle LTPO qui descend
   très bas au repos, et c'est la cadence du geste — la seule qui décide du
   critère de la phase 1 — qu'il faut connaître.
   ------------------------------------------------------------------ */

/** En dessous, ce n'est pas une image : doublon de callback ou hoquet d'horloge. */
const MIN_DT = 2
/** Au-delà, l'app était en arrière-plan : l'intervalle mesure la pause. */
const PAUSE_DT = 250
/** Un intervalle « d'accord » avec la période courante à ± 12 %. */
const TOL = 0.12
/** Affinage de la période par les intervalles qui votent pour elle. */
const EMA = 0.05
/** Plafond du compteur de voix : borne le temps qu'un vrai changement met à s'imposer. */
const VOTE_CAP = 90
/** En dessous, la période n'est pas assez confirmée pour être annoncée. */
const MIN_VOTES = 48
/** Une image est « longue » au-delà de ce multiple de la période. */
const LONG_FACTOR = 1.5

/**
 * Compteur d'images longues pendant un geste, entièrement sur le thread UI.
 *
 * `React.memo` : le composant n'a ni props ni état, mais `useFrameCallback` se
 * réenregistre à chaque nouvelle identité de callback. Sans mémo, chaque rendu
 * de l'écran parent détruit et recrée la boucle d'images.
 */
export const FrameMeter = React.memo(function FrameMeter() {
  const { gestureActive } = useGridShared()

  /** Période estimée, en ms. 0 = on ne sait pas encore, et on le dit. */
  const period = useSharedValue(0)
  /** Voix en faveur de la période courante (vote majoritaire de Boyer–Moore). */
  const votes = useSharedValue(0)
  /** 1 dès qu'un geste a nourri l'estimateur : la mesure n'est plus provisoire. */
  const fromGesture = useSharedValue(0)

  const frames = useSharedValue(0)
  const long = useSharedValue(0)
  const worst = useSharedValue(0)
  const wasActive = useSharedValue(0)

  useFrameCallback((info) => {
    const dt = info.timeSincePreviousFrame
    // Première image après enregistrement : Reanimated passe null, pas un zéro.
    // L'ancienne version en fabriquait un 0 avec `?? 0`, qu'il fallait ensuite
    // filtrer — autant ne jamais le fabriquer.
    if (dt === null) return
    // Retour d'arrière-plan : cet intervalle mesure la pause, pas une image.
    // Sans ce filtre, « pire » afficherait des centaines de millisecondes.
    if (dt > PAUSE_DT || dt < MIN_DT) return

    const active = gestureActive.value === 1

    // Le premier geste efface ce qui a été mesuré au repos : sur une dalle
    // LTPO les deux régimes n'ont rien à voir, les mélanger n'aurait aucun sens.
    if (active && fromGesture.value === 0) {
      fromGesture.value = 1
      period.value = 0
      votes.value = 0
    }

    // On échantillonne pendant les gestes ; avant le tout premier, on accepte
    // le repos pour donner un ordre de grandeur, affiché comme provisoire.
    if (active || fromGesture.value === 0) {
      if (votes.value === 0) {
        period.value = dt
        votes.value = 1
      } else if (Math.abs(dt - period.value) <= period.value * TOL) {
        // d'accord : une voix de plus, et la période se précise
        if (votes.value < VOTE_CAP) votes.value += 1
        period.value += (dt - period.value) * EMA
      } else {
        // en désaccord : une voix de moins. Il faut une SÉRIE d'intervalles
        // concordants pour renverser la période — c'est tout l'intérêt.
        votes.value -= 1
        if (votes.value <= 0) {
          period.value = dt
          votes.value = 1
        }
      }
    }

    if (active) {
      if (wasActive.value === 0) {
        frames.value = 0
        long.value = 0
        worst.value = 0
        wasActive.value = 1
      }
      frames.value += 1
      if (dt > worst.value) worst.value = dt
      // Tant que la période n'est pas confirmée, on ne compte AUCUNE image
      // longue : un compte adossé à un budget faux est pire qu'un compte absent.
      if (votes.value >= MIN_VOTES && dt > period.value * LONG_FACTOR) long.value += 1
    } else {
      wasActive.value = 0
    }
  })

  const props = useAnimatedProps(() => {
    const pire = `pire ${worst.value.toFixed(0)} ms`
    if (votes.value < MIN_VOTES) {
      const pct = Math.round((votes.value / MIN_VOTES) * 100)
      const quoi = fromGesture.value === 1 ? 'geste' : 'repos'
      return { text: `… Hz · calibrage ${quoi} ${pct} % · ${pire}`, defaultValue: '' }
    }
    const p = period.value
    // « ≈ » : mesure prise au repos, donc pas encore celle qui juge le critère.
    const marque = fromGesture.value === 1 ? '' : '≈ '
    // On affiche le seuil RÉELLEMENT appliqué. L'ancienne version imprimait la
    // période et comparait à 1,5 fois la période : l'étiquette mentait d'un
    // facteur 1,5, indépendamment de l'erreur sur la cadence.
    return {
      text:
        `${marque}${Math.round(1000 / p)} Hz · ${p.toFixed(2)} ms · ` +
        `${long.value}/${frames.value} > ${(p * LONG_FACTOR).toFixed(1)} ms · ${pire}`,
      defaultValue: '',
    }
  })

  return (
    <AnimatedTextInput
      editable={false}
      animatedProps={props}
      style={styles.meter}
      underlineColorAndroid="transparent"
    />
  )
})

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
