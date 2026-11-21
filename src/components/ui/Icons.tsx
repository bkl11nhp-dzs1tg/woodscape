import type { MouseEventHandler } from 'react'

/**
 * Small line icons for the panels' buttons, drawn in the current text colour so they follow hover, active and
 * disabled states. Every IconButton keeps a tooltip and an accessible name, so nothing is lost without the words.
 */

const PATHS = {
  fill: 'M12 3l7 7-7 7-7-7z M19 15c1 1.5 1.5 2.2 1.5 3a1.5 1.5 0 0 1-3 0c0-.8.5-1.5 1.5-3z',
  eraser: 'M3 17l9-10 8 8-5 5H8z M9 11l6 6',
  wall: 'M3 6h18v12H3z M3 12h18 M9 6v6 M15 12v6',
  fence: 'M3 20V8l2-3 2 3v12 M10 20V8l2-3 2 3v12 M17 20V8l2-3 2 3v12 M3 12h18 M3 16h18',
  path: 'M8 21c0-5 8-5 8-10S10 7 12 3',
  straight: 'M4 17l13-13 3 3L7 20z M9 11l2 2 M12 8l2 2 M6 14l2 2',
  undo: 'M9 14L4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3',
  loop: 'M5 7l8-3 6 6-3 9H6z',
  check: 'M5 12l5 5 9-10',
  line: 'M5 19L19 5 M3.4 19a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 1 0-3.2 0 M17.4 5a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 1 0-3.2 0',
  pen: 'M4 20l1-5L16 4l4 4L9 19z M14 6l4 4',
  focus: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v4 M12 18v4 M2 12h4 M18 12h4',
  duplicate: 'M8 8h11v11H8z M5 16V5h11',
  trash: 'M5 7h14 M9 7V4h6v3 M7 7l1 13h8l1-13 M10 11v6 M14 11v6',
  group: 'M4 4h16v16H4z M8 8h4v4H8z M12 12h4v4h-4z',
  ungroup: 'M3 3h8v8H3z M13 13h8v8h-8z',
  rotateLeft: 'M4 12a8 8 0 1 0 3-6.2 M4 4v5h5',
  rotateRight: 'M20 12a8 8 0 1 1-3-6.2 M20 4v5h-5',
  close: 'M6 6l12 12 M18 6L6 18',
  roof: 'M3 13l9-8 9 8 M6 11v9h12v-9',
  door: 'M7 21V4h10v17 M7 21h10 M14 12h.01',
  build: 'M5 20h14 M7 20V10l5-5 5 5v10 M10 20v-5h4v5',
  arrowUp: 'M12 19V5 M6 11l6-6 6 6',
  arrowDown: 'M12 5v14 M6 13l6 6 6-6',
  run: 'M13 3L5 14h6l-1 7 8-11h-6z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  star: 'M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z',
  hand: 'M9 11V5.5a1.5 1.5 0 0 1 3 0V11 M12 10V8.5a1.5 1.5 0 0 1 3 0V11 M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L4.5 14a1.5 1.5 0 0 1 2.5-1.5L9 15',
  home: 'M4 11l8-7 8 7 M6 10v10h12V10 M10 20v-6h4v6',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  sunrise: 'M3 18h18 M7 18a5 5 0 0 1 10 0 M12 4v4 M5 9l2 2 M19 9l-2 2 M9 6l3-3 3 3',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5',
  sunset: 'M3 18h18 M7 18a5 5 0 0 1 10 0 M12 4v4 M5 9l2 2 M19 9l-2 2 M9 6l3 3 3-3',
  download: 'M12 4v11 M7 11l5 5 5-5 M5 20h14',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
} as const

export type IconName = keyof typeof PATHS

export function Glyph({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}

interface IconButtonProps {
  icon: IconName
  /** Tooltip and accessible name. */
  label: string
  onClick: MouseEventHandler<HTMLButtonElement>
  /** Short word shown next to the icon; the longer `label` stays as the tooltip. */
  text?: string
  primary?: boolean
  danger?: boolean
  /** A toggle that is switched on. */
  pressed?: boolean
  disabled?: boolean
}

export function IconButton({ icon, label, onClick, text, primary, danger, pressed, disabled }: IconButtonProps) {
  const classes = ['ibtn', primary && 'primary', danger && 'danger', pressed && 'active', text && 'with-label'].filter(Boolean).join(' ')
  return (
    <button className={classes} title={label} aria-label={label} aria-pressed={pressed} disabled={disabled} onClick={onClick}>
      <Glyph name={icon} />
      {text && <span>{text}</span>}
    </button>
  )
}
