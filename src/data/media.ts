/* ------------------------------------------------------------------
   Gestion des images.

   Les photos de telephone font 4 a 8 Mo. On les redimensionne avant
   stockage : le site reste rapide, et l'envoi depuis la 4G ne dure pas
   une eternite.
   ------------------------------------------------------------------ */

const MAX_DIMENSION = 1920
const QUALITY = 0.84
const SKIP_UNDER = 220 * 1024 // en dessous, ca ne vaut pas le coup

export const isImage = (file: File): boolean => file.type.startsWith('image/')

/**
 * Redimensionne et recompresse une image.
 * Les GIF (animes) et SVG passent tels quels.
 */
export async function compressImage(file: File, maxDimension = MAX_DIMENSION): Promise<Blob> {
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  if (file.size < SKIP_UNDER && file.type === 'image/jpeg') return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    )
    // Si la compression n'a rien gagne, on garde l'original.
    if (!blob || blob.size >= file.size) return file
    return blob
  } catch {
    // Format exotique ou navigateur recalcitrant : on garde l'original.
    return file
  }
}

/** Nom de fichier propre pour le stockage. */
export function safeName(file: File): string {
  const base = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60)
  return base || 'photo.jpg'
}

/** Ouvre le selecteur de fichiers et renvoie les images choisies. */
export function pickFiles(multiple = true): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = multiple
    input.onchange = () => resolve(Array.from(input.files ?? []).filter(isImage))
    // Si l'utilisateur annule, la promesse ne se resout jamais : on nettoie
    // au retour du focus sur la fenetre.
    window.addEventListener(
      'focus',
      () => setTimeout(() => resolve(Array.from(input.files ?? []).filter(isImage)), 400),
      { once: true },
    )
    input.click()
  })
}

/** Recupere les images d'un evenement de glisser-deposer ou de collage. */
export function filesFromEvent(e: DragEvent | ClipboardEvent): File[] {
  const dt = 'dataTransfer' in e ? e.dataTransfer : (e as ClipboardEvent).clipboardData
  if (!dt) return []
  return Array.from(dt.files).filter(isImage)
}

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
