import React, { useState } from 'react'
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DEMO_MESSAGES, type DemoMessage } from '../data/demo'
import { colors, fonts, radius } from '../theme'

/**
 * Messagerie factice : sert uniquement à juger le clavier (pas de saut,
 * champ toujours visible, liste qui suit). Le vrai écran utilisera FlashList
 * v2 et, si nécessaire, react-native-keyboard-controller.
 */
export function ChatScreen() {
  const insets = useSafeAreaInsets()
  const [messages, setMessages] = useState<DemoMessage[]>(() => [...DEMO_MESSAGES].reverse())
  const [draft, setDraft] = useState('')

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setMessages((prev) => [{ id: `m-${Date.now()}`, mine: true, text }, ...prev])
    setDraft('')
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>M</Text></View>
        <View>
          <Text style={styles.name}>Mimi</Text>
          <Text style={styles.presence}>● En ligne · consulte le calendrier</Text>
        </View>
      </View>
      <FlatList
        data={messages}
        inverted
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        keyboardDismissMode="interactive"
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.mine ? styles.mine : styles.theirs]}>
            <Text style={[styles.text, item.mine && styles.textMine]}>{item.text}</Text>
          </View>
        )}
      />
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Écrire à Mimi…"
          placeholderTextColor={colors.ink3}
          style={styles.input}
          multiline
          enterKeyHint="send"
          onSubmitEditing={send}
        />
        <Pressable onPress={send} style={styles.send} accessibilityRole="button" accessibilityLabel="Envoyer">
          <Text style={styles.sendText}>♥</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.inkOnAccent, fontWeight: '600' },
  name: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  presence: { fontFamily: fonts.sans, fontSize: 11, color: colors.sage },
  list: { paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.md },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.accent },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  text: { fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
  textMine: { color: colors.inkOnAccent },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.ink,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: colors.inkOnAccent, fontSize: 18 },
})
