import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { WeekScreen } from './src/screens/WeekScreen'
import { ChatScreen } from './src/screens/ChatScreen'
import { colors, fonts } from './src/theme'

type Screen = 'week' | 'chat'

function Shell() {
  const [screen, setScreen] = useState<Screen>('week')
  const insets = useSafeAreaInsets()
  return (
    <View style={styles.root}>
      {screen === 'week' ? <WeekScreen /> : <ChatScreen />}
      <View style={[styles.switch, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {(['week', 'chat'] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setScreen(s)}
            style={[styles.tab, screen === s && styles.tabOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: screen === s }}
          >
            <Text style={[styles.tabText, screen === s && styles.tabTextOn]}>{s === 'week' ? 'Semaine' : 'Messages'}</Text>
          </Pressable>
        ))}
      </View>
      <StatusBar style="dark" />
    </View>
  )
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Shell />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  switch: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  tab: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface3 },
  tabOn: { backgroundColor: colors.accent },
  tabText: { fontFamily: fonts.sans, fontWeight: '600', color: colors.ink2 },
  tabTextOn: { color: colors.inkOnAccent },
})
