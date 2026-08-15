/* ------------------------- Édition rapide de l'accueil -------------------------
   Le même formulaire que la page Réglages, en plus court : on l'ouvre
   depuis le crayon posé sur la photo d'accueil.
   ------------------------------------------------------------------------------ */

import { useEffect, useState } from 'react'
import { useStore } from '../data/store'
import { FormModal } from './ui/Modal'
import { ColorInput, DateInput, Field, Input } from './ui/form'
import { SinglePhotoInput } from './ui/Img'

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, saveSettings } = useStore()
  const [draft, setDraft] = useState(settings)

  useEffect(() => {
    if (open) setDraft(settings)
  }, [open, settings])

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Personnaliser l'accueil"
      onSubmit={async () => {
        await saveSettings({
          siteName: draft.siteName,
          tagline: draft.tagline,
          startDate: draft.startDate,
          coverPhoto: draft.coverPhoto,
          people: draft.people,
        })
        onClose()
      }}
    >
      <div className="form-grid">
        {draft.people.map((p, i) => (
          <Field key={p.id} label={`Prénom ${i + 1}`}>
            <div className="row" style={{ gap: 8 }}>
              <Input
                value={p.name}
                onChange={(v) =>
                  setDraft({
                    ...draft,
                    people: draft.people.map((x) => (x.id === p.id ? { ...x, name: v } : x)),
                  })
                }
              />
              <ColorInput
                value={p.color}
                onChange={(v) =>
                  setDraft({
                    ...draft,
                    people: draft.people.map((x) => (x.id === p.id ? { ...x, color: v } : x)),
                  })
                }
              />
            </div>
          </Field>
        ))}
      </div>

      <Field label="Votre phrase">
        <Input
          value={draft.tagline}
          onChange={(v) => setDraft({ ...draft, tagline: v })}
          placeholder="Notre petit espace à deux."
        />
      </Field>

      <div className="form-grid">
        <Field label="Nom de l'espace">
          <Input value={draft.siteName} onChange={(v) => setDraft({ ...draft, siteName: v })} />
        </Field>
        <Field label="Depuis le">
          <DateInput value={draft.startDate} onChange={(v) => setDraft({ ...draft, startDate: v })} />
        </Field>
      </div>

      <SinglePhotoInput
        label="Photo de couverture"
        value={draft.coverPhoto}
        onChange={(v) => setDraft({ ...draft, coverPhoto: v })}
        aspect="16 / 9"
      />
    </FormModal>
  )
}
