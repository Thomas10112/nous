/* ------------------------------------------------------------------
   Premier lancement.

   - mode "full"     : personne n'a encore configure le site.
   - mode "identity" : le site existe (l'autre l'a rempli), on demande
                       juste qui vient d'arriver.
   ------------------------------------------------------------------ */

import { motion } from 'framer-motion'
import { useState } from 'react'
import { useStore } from '../data/store'
import { DEFAULT_SETTINGS, type Person } from '../data/types'
import { Button, Avatar } from '../components/ui/primitives'
import { ColorInput, Field, Input } from '../components/ui/form'
import { SinglePhotoInput } from '../components/ui/Img'
import { Icon } from '../components/ui/Icon'
import { todayISO } from '../lib/date'

const PALETTE = ['#c4736e', '#7d5f77', '#7c9a81', '#c19a45', '#6f8bab', '#b8785f']

export function Onboarding({ mode }: { mode: 'full' | 'identity' }) {
  const { settings, saveSettings, setMe, notify, user } = useStore()
  const [step, setStep] = useState(0)

  const [people, setPeople] = useState<Person[]>(settings.people)
  const [startDate, setStartDate] = useState(settings.startDate || todayISO())
  const [siteName, setSiteName] = useState(settings.siteName)
  const [tagline, setTagline] = useState('')
  const [cover, setCover] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)

  const setPerson = (i: number, patch: Partial<Person>) =>
    setPeople((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))

  const finish = async () => {
    setSaving(true)
    try {
      await saveSettings({
        ...DEFAULT_SETTINGS,
        siteName: siteName.trim() || 'Nous',
        tagline: tagline.trim() || DEFAULT_SETTINGS.tagline,
        startDate,
        people,
        coverPhoto: cover,
        // C'est ce compte qui offre le site : la surprise se jouera pour
        // l'autre, à sa première connexion.
        setupBy: user?.id,
      })
      setStep(2)
    } catch {
      notify('Enregistrement impossible', 'error')
    } finally {
      setSaving(false)
    }
  }

  const bothNamed = people.every((p) => p.name.trim().length > 0)

  /* ------------------------------ Identité seule ------------------------------ */
  if (mode === 'identity') {
    return (
      <Shell title={settings.siteName} subtitle="Qui vient d'arriver ?">
        <div className="stack" style={{ gap: 12 }}>
          {settings.people.map((p) => (
            <button
              key={p.id}
              type="button"
              className="card card--pad card--hover"
              style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
              onClick={() => setMe(p.id)}
            >
              <Avatar person={p} size="lg" />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-md)' }}>
                {p.name}
              </span>
              <span style={{ marginLeft: 'auto', color: 'var(--ink-3)', display: 'grid' }}>
                <Icon name="chevron-right" size={18} />
              </span>
            </button>
          ))}
        </div>
      </Shell>
    )
  }

  /* -------------------------------- Étape 1 -------------------------------- */
  if (step === 0) {
    return (
      <Shell
        title="Bonjour vous deux"
        subtitle="Deux ou trois choses, et cet endroit est à vous."
      >
        <div className="stack" style={{ gap: 'var(--sp-5)' }}>
          <div className="form-grid">
            {people.map((p, i) => (
              <div key={p.id} className="stack" style={{ gap: 8 }}>
                <span className="field__label">{i === 0 ? 'Elle / lui' : 'Toi'}</span>
                <div className="row" style={{ gap: 8 }}>
                  <Input
                    value={p.name}
                    onChange={(v) => setPerson(i, { name: v })}
                    placeholder="Prénom"
                    autoFocus={i === 0}
                  />
                  <ColorInput value={p.color} onChange={(v) => setPerson(i, { color: v })} />
                </div>
                <div className="row wrap" style={{ gap: 5 }}>
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPerson(i, { color: c })}
                      aria-label={c}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 999,
                        background: c,
                        border: p.color === c ? '2px solid var(--ink)' : '2px solid transparent',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Field label="Depuis quand ?" hint="Le compteur de l'accueil part de cette date.">
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>

          <Button
            variant="primary"
            size="lg"
            block
            iconRight="chevron-right"
            disabled={!bothNamed}
            onClick={() => setStep(1)}
          >
            Continuer
          </Button>
        </div>
      </Shell>
    )
  }

  /* -------------------------------- Étape 2 -------------------------------- */
  if (step === 1) {
    return (
      <Shell title="Votre page d'accueil" subtitle="Vous pourrez tout changer plus tard.">
        <div className="stack" style={{ gap: 'var(--sp-5)' }}>
          <Field label="Le nom de votre espace">
            <Input value={siteName} onChange={setSiteName} placeholder="Nous" />
          </Field>

          <Field label="Une phrase à vous" hint="Une private joke, une promesse, trois mots.">
            <Input
              value={tagline}
              onChange={setTagline}
              placeholder="Notre petit espace à deux."
            />
          </Field>

          <SinglePhotoInput value={cover} onChange={setCover} label="Votre photo" aspect="16 / 10" />

          <div className="row" style={{ gap: 10 }}>
            <Button variant="ghost" icon="chevron-left" onClick={() => setStep(0)}>
              Retour
            </Button>
            <Button
              variant="primary"
              size="lg"
              block
              onClick={() => void finish()}
              disabled={saving}
              iconRight="heart-filled"
            >
              {saving ? 'Un instant…' : 'C’est parti'}
            </Button>
          </div>
        </div>
      </Shell>
    )
  }

  /* -------------------------------- Étape 3 -------------------------------- */
  return (
    <Shell title="Et toi, tu es qui ?" subtitle="Pour signer ce que tu écris.">
      <div className="stack" style={{ gap: 12 }}>
        {people.map((p) => (
          <button
            key={p.id}
            type="button"
            className="card card--pad card--hover"
            style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
            onClick={() => setMe(p.id)}
          >
            <Avatar person={p} size="lg" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-md)' }}>{p.name}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--ink-3)', display: 'grid' }}>
              <Icon name="chevron-right" size={18} />
            </span>
          </button>
        ))}
      </div>
    </Shell>
  )
}

/* ------------------------------- Habillage ------------------------------- */

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--sp-5)',
        background:
          'radial-gradient(120% 90% at 50% 0%, var(--accent-soft) 0%, var(--bg) 55%)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        style={{ width: '100%', maxWidth: 520 }}
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
          <h1 style={{ fontSize: 'var(--t-xl)' }}>{title}</h1>
          <p className="muted" style={{ marginTop: 8, fontSize: 'var(--t-sm)' }}>
            {subtitle}
          </p>
        </div>

        <div className="card card--pad" style={{ padding: 'var(--sp-6)' }}>
          {children}
        </div>
      </motion.div>
    </div>
  )
}
