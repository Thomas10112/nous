/* ------------------------------------------------------------------
   Ecran de connexion.

   Pas d'inscription : les deux comptes sont crees a la main dans le
   tableau de bord Supabase. Un site prive n'a aucune raison d'accepter
   de nouveaux venus.
   ------------------------------------------------------------------ */

import { AnimatePresence, motion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { useStore } from '../data/store'
import { Icon } from '../components/ui/Icon'
import { Button } from '../components/ui/primitives'
import { Field, Input } from '../components/ui/form'
import { loginEmail } from '../lib/login'

export default function Login() {
  const { signIn } = useStore()

  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || !nickname.trim() || !password) return

    setBusy(true)
    setError(null)
    try {
      // Le surnom devient une adresse technique que Supabase comprend.
      await signIn(loginEmail(nickname), password)
      // Pas de redirection a faire : le store bascule tout seul des que
      // la session s'ouvre.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible')
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--sp-5)',
        background: 'radial-gradient(120% 90% at 50% 0%, var(--accent-soft) 0%, var(--bg) 55%)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        style={{ width: '100%', maxWidth: 400 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-6)' }}>
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 18 }}
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: 'var(--surface)',
              color: 'var(--accent)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto var(--sp-4)',
              boxShadow: 'var(--shadow)',
            }}
          >
            <Icon name="heart-filled" size={26} />
          </motion.div>

          <h1 style={{ fontSize: 'var(--t-xl)' }}>Nous</h1>
          <p className="muted" style={{ marginTop: 8, fontSize: 'var(--t-sm)' }}>
            Cet endroit n'est ouvert qu'à vous deux.
          </p>
        </div>

        <form onSubmit={submit} className="card card--pad" style={{ padding: 'var(--sp-6)' }}>
          <div className="stack" style={{ gap: 'var(--sp-4)' }}>
            <Field label="Le surnom que je te donne le +">
              <Input
                value={nickname}
                onChange={setNickname}
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="…"
                autoFocus
                required
              />
            </Field>

            <Field label="Mot de passe">
              <Input
                value={password}
                onChange={setPassword}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </Field>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 14px',
                      borderRadius: 'var(--r-sm)',
                      background: 'rgba(180, 67, 63, 0.1)',
                      color: '#b4433f',
                      fontSize: 'var(--t-sm)',
                    }}
                  >
                    <Icon name="close" size={14} strokeWidth={2.2} />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              disabled={busy || !nickname.trim() || !password}
            >
              {busy ? 'Un instant…' : 'Entrer'}
            </Button>

            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              style={{
                border: 'none',
                background: 'none',
                color: 'var(--ink-3)',
                fontSize: 'var(--t-xs)',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              Mot de passe oublié ?
            </button>

            <AnimatePresence>
              {showHelp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <p
                    className="muted"
                    style={{ fontSize: 'var(--t-xs)', lineHeight: 1.7, textAlign: 'center' }}
                  >
                    Il n'y a pas d'envoi d'e-mail sur ce site. Le mot de passe se réinitialise
                    depuis le tableau de bord Supabase&nbsp;: <em>Authentication → Users →</em> les
                    trois points en bout de ligne → <em>Reset password</em>.
                    <br />
                    <br />
                    Le surnom ne tient compte ni des accents, ni des majuscules&nbsp;: «&nbsp;Mon
                    Cœur&nbsp;» et «&nbsp;mon coeur&nbsp;» sont le même.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
