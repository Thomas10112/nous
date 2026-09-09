import React, { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { DemoEvent } from '../data/demo'
import { DAY_LABELS } from '../data/demo'
import { DAYS_PER_WEEK, clamp } from '../domain/time'
import { DAY_END, DAY_START, inkWeight } from '../domain/phrase'
import { dateOf, isToday } from '../domain/dates'
import { colors, fonts } from '../theme'
import { Heart } from './Heart'

const CUT_W = 13
const CUT_H = 44
/** Au-delà de quatre marques la tranche devient illisible. */
const MAX_MARKS = 4
/** Deux marques à moins de 12 % l'une de l'autre se décalent latéralement. */
const NEAR = 0.12

interface Props {
  weekOffset: number
  day: number
  events: readonly DemoEvent[]
  onSelect: (day: number) => void
}

/**
 * La coupe d'une journée : une tranche de papier de 7 h à 23 h, où chaque
 * marque est posée à SON heure. On y lit un rythme — matin creux, soirée
 * pleine — jamais un titre. Ni jauge, ni pastille, ni fond dégradé : le jury
 * de conception a écarté les trois, qui font glisser vers le tableau de bord
 * (ADR-010).
 */
function Cut({ events }: { events: readonly DemoEvent[] }) {
  const marks = useMemo(() => {
    const all = [...events].sort((a, b) => a.window.startSlot - b.window.startSlot)
    // on garde le premier, le dernier et deux du milieu : prendre les quatre
    // premiers ferait croire à une journée qui s'arrête à midi
    const items =
      all.length <= MAX_MARKS
        ? all
        : [0, 1 / 3, 2 / 3, 1]
            .map((f) => all[Math.round(f * (all.length - 1))])
            .filter((x): x is DemoEvent => x !== undefined)
    const used: number[] = []
    return items.map((e) => {
      const t = clamp((e.window.startSlot - DAY_START) / (DAY_END - DAY_START), 0, 1)
      const near = used.filter((y) => Math.abs(y - t) < NEAR).length
      used.push(t)
      // décalage en pixels, jamais en pourcentage : la tranche ne fait que 13 px
      return { id: e.id, kind: e.kind, color: e.personColor, t, dx: near === 0 ? 0 : near === 1 ? 3.5 : -3.5 }
    })
  }, [events])

  return (
    <View style={styles.cut}>
      {marks.map((m) => (
        <View key={m.id} style={[styles.mark, { top: m.t * CUT_H - 4, transform: [{ translateX: m.dx }] }]}>
          {m.kind === 'personal' ? (
            <View style={[styles.dot, { backgroundColor: m.color ?? colors.ink3 }]} />
          ) : (
            <Heart size={8} color={m.kind === 'nous' ? colors.accent : colors.plum} />
          )}
        </View>
      ))}
    </View>
  )
}

/**
 * Le bandeau des sept jours. Il ne remplace pas une vue Semaine : il n'en
 * montre pas le contenu, seulement le rythme, et sert à choisir la journée
 * qui, elle, s'ouvre en pleine largeur.
 */
export function DayStrip({ weekOffset, day, events, onSelect }: Props) {
  const byDay = useMemo(() => {
    const map: DemoEvent[][] = Array.from({ length: DAYS_PER_WEEK }, () => [])
    for (const e of events) map[e.window.day]!.push(e)
    return map
  }, [events])

  return (
    <View style={styles.strip}>
      {byDay.map((dayEvents, d) => {
        const date = dateOf(weekOffset, d)
        const today = isToday(date)
        const ink = inkWeight(dayEvents.length)
        return (
          <Pressable
            key={d}
            onPress={() => onSelect(d)}
            style={[styles.cell, d === day && styles.cellSel]}
            accessibilityRole="button"
            accessibilityState={{ selected: d === day }}
            accessibilityLabel={`${DAY_LABELS[d]} ${date.getDate()}, ${dayEvents.length} élément(s)`}
          >
            <Text style={styles.weekday}>{(DAY_LABELS[d] ?? '').slice(0, 1)}</Text>
            <Text
              style={[
                styles.num,
                ink === 'vide' && styles.numVide,
                ink === 'leger' && styles.numLeger,
                ink === 'charge' && styles.numCharge,
                today && styles.numToday,
              ]}
            >
              {date.getDate()}
            </Text>
            <View style={styles.todayRow}>{today && <Heart size={8} color={colors.accent} />}</View>
            <Cut events={dayEvents} />
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 2, paddingHorizontal: 8, paddingTop: 6, paddingBottom: 2 },
  cell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 1,
    paddingTop: 6,
    paddingBottom: 5,
    borderRadius: 14,
  },
  cellSel: {
    backgroundColor: colors.paper,
    shadowColor: '#22303c',
    shadowOpacity: 0.13,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  weekday: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 0.4, color: colors.ink3 },
  num: { fontFamily: fonts.display, fontSize: 19, lineHeight: 21, fontVariant: ['tabular-nums'] },
  /* la charge d'un jour se dit par l'encre du chiffre, jamais par une jauge */
  numVide: { color: colors.ink3 },
  numLeger: { color: colors.ink2 },
  numCharge: { color: colors.ink, fontWeight: '500' },
  numToday: { color: colors.accentInk },
  todayRow: { height: 8, justifyContent: 'center' },
  cut: {
    width: CUT_W,
    height: CUT_H,
    marginTop: 3,
    borderRadius: CUT_W / 2,
    backgroundColor: colors.surface3,
  },
  mark: { position: 'absolute', left: 0, right: 0, height: 8, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2 },
})
