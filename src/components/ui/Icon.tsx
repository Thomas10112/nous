/* Jeu d'icones au trait, dessinees a la main : aucune dependance,
   un style homogene, et elles heritent de la couleur du texte. */

export type IconName =
  | 'home' | 'book' | 'quote' | 'house' | 'map' | 'list' | 'gallery'
  | 'trophy' | 'capsule' | 'brush' | 'settings' | 'plus' | 'close'
  | 'search' | 'edit' | 'trash' | 'heart' | 'heart-filled' | 'star'
  | 'star-filled' | 'chevron-left' | 'chevron-right' | 'chevron-down'
  | 'check' | 'image' | 'pen' | 'text' | 'note' | 'sticker' | 'eraser'
  | 'cursor' | 'undo' | 'zoom-in' | 'zoom-out' | 'lock' | 'unlock'
  | 'calendar' | 'pin' | 'cloud' | 'device' | 'download' | 'upload'
  | 'menu' | 'sun' | 'moon' | 'filter' | 'grid' | 'rows' | 'shape'
  | 'sparkle' | 'link' | 'drag' | 'layers' | 'target'

const paths: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20a1 1 0 0 0 1 1H9.5v-5.5h5V21h3a1 1 0 0 0 1-1V9.5',
  book: 'M4 4.5A1.5 1.5 0 0 1 5.5 3H19v18H5.5A1.5 1.5 0 0 1 4 19.5zM19 17H5.5M8 7.5h7M8 11h5',
  quote: 'M9.5 5.5C6.5 7 5 9.5 5 13v5.5h6V13H8c0-2.5.8-4.2 2.5-5zm9 0C15.5 7 14 9.5 14 13v5.5h6V13h-3c0-2.5.8-4.2 2.5-5z',
  house: 'M3 11 12 4l9 7M6 10v10h12V10M10 20v-5h4v5',
  map: 'M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5zM9 4v13M15 6.5v13',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  gallery: 'M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5zM3 16l4.5-4.5 4 4L15 12l6 5.5M15.5 8.5h.01',
  trophy: 'M7 4h10v5a5 5 0 0 1-10 0zM7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11M12 14v4M8.5 21h7l-1-3h-5z',
  capsule: 'M8 3h8v3.5l-2.5 4v6.8L16 21H8l2.5-3.7v-6.8L8 6.5zM8 6.5h8',
  brush: 'M15 4.5 19.5 9 10 18.5H5.5V14zM13 6.5 17.5 11M4 21h16',
  settings: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1L7.3 20a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1-2.7H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1-2.8L4 7.3a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.8 1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1 2.7H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  edit: 'M16.5 3.5 20.5 7.5 8 20H4v-4zM14.5 5.5l4 4',
  trash: 'M4 7h16M9 7V4.5h6V7M6 7l1 13.5h10L18 7M10 11v6M14 11v6',
  heart: 'M12 20.5C7 17 3.5 13.8 3.5 10A4.5 4.5 0 0 1 12 7.8 4.5 4.5 0 0 1 20.5 10c0 3.8-3.5 7-8.5 10.5z',
  'heart-filled': 'M12 20.5C7 17 3.5 13.8 3.5 10A4.5 4.5 0 0 1 12 7.8 4.5 4.5 0 0 1 20.5 10c0 3.8-3.5 7-8.5 10.5z',
  star: 'M12 3.5l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.9l6.1-.8z',
  'star-filled': 'M12 3.5l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.9l6.1-.8z',
  'chevron-left': 'M15 5l-7 7 7 7',
  'chevron-right': 'M9 5l7 7-7 7',
  'chevron-down': 'M5 9l7 7 7-7',
  check: 'M4.5 12.5 9.5 17.5 19.5 6.5',
  image: 'M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5zM3 16l4.5-4.5 4 4L15 12l6 5.5M15.5 8.5h.01',
  pen: 'M3 21l1.2-4.2L15.5 5.5a2.1 2.1 0 0 1 3 3L7.2 19.8zM13.5 7.5l3 3',
  text: 'M5 6.5V4.5h14v2M12 4.5V20M8.5 20h7',
  note: 'M5 4.5h14v10.5L14.5 20H5zM19 15h-4.5v5',
  sticker: 'M12 3.5a8.5 8.5 0 1 1-8.5 8.5M12 3.5 20.5 12M20.5 12H15a2.5 2.5 0 0 0-2.5 2.5v5.9M8.5 10h.01M14 9h.01M9 15c1 1 3.5 1 4.5 0',
  eraser: 'M8 20h12M15 4.5l5 5-8.5 8.5H6.5L4 15.5zM10 9.5l5 5',
  cursor: 'M5 3l14 7-6 2-2.5 6.5z',
  undo: 'M4 9h10a5 5 0 0 1 0 10h-4M4 9l4-4M4 9l4 4',
  'zoom-in': 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4M11 8v6M8 11h6',
  'zoom-out': 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4M8 11h6',
  lock: 'M6 11h12v9.5H6zM8.5 11V7.5a3.5 3.5 0 1 1 7 0V11M12 15v2.5',
  unlock: 'M6 11h12v9.5H6zM8.5 11V7.5a3.5 3.5 0 0 1 6.8-1.2M12 15v2.5',
  calendar: 'M4 6.5h16V20H4zM4 10.5h16M8.5 3.5v4M15.5 3.5v4',
  pin: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  cloud: 'M7 18.5a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17.3 9.6 3.9 3.9 0 0 1 17 18.5z',
  device: 'M3 5.5h13v10H3zM3 15.5h13M7 20h5M19 9h2.5v11H19zM19 9V7.5h2.5V9',
  download: 'M12 4v11M7.5 11l4.5 4.5 4.5-4.5M4.5 19.5h15',
  upload: 'M12 19.5v-11M7.5 12.5 12 8l4.5 4.5M4.5 20.5h15',
  menu: 'M4 7h16M4 12h16M4 17h16',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z',
  filter: 'M3.5 5.5h17l-6.5 8v6l-4 2v-8z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  rows: 'M4 5h16v5H4zM4 14h16v5H4z',
  shape: 'M4 4h7v7H4zM17 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM12 20.5 8 14h8z',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
  link: 'M10.5 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 1 0-5.7-5.7l-1.4 1.4M13.5 10.5a4 4 0 0 0-5.7 0L5 13.3a4 4 0 1 0 5.7 5.7l1.4-1.4',
  drag: 'M9 6.5h.01M15 6.5h.01M9 12h.01M15 12h.01M9 17.5h.01M15 17.5h.01',
  layers: 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
}

const filled: IconName[] = ['heart-filled', 'star-filled']

interface IconProps {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
}

export function Icon({ name, size = 20, strokeWidth = 1.6, className }: IconProps) {
  const isFilled = filled.includes(name)
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isFilled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      <path d={paths[name]} />
    </svg>
  )
}
