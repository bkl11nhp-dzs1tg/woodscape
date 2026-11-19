import { useState, type ReactNode } from 'react'
import type { LengthUnit } from '../../types/world'

export const UNIT_SCALE: Record<LengthUnit, number> = { m: 1, cm: 100, mm: 1000 }
export const UNIT_DIGITS: Record<LengthUnit, number> = { m: 3, cm: 1, mm: 0 }

/**
 * Building blocks shared by every panel, so they all read the same: a folding section with a small gold
 * title, and form rows with the label on the left and the control on the right (as in Settings).
 */

/** A titled block that folds away. `open` is only the starting state. */
export function Section({ title, open = false, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="sec" open={open}>
      <summary>
        <span className="sec-title">{title}</span>
      </summary>
      <div className="sec-body">{children}</div>
    </details>
  )
}

/** Text box that commits a number on Enter or blur, so one edit is one undo step. */
function NumInput(props: { value: number; digits: number; min?: number; prefix?: string; suffix?: string; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = String(Number(props.value.toFixed(props.digits)))
  const commit = () => {
    if (draft === null) return
    const parsed = Number(draft.replace(',', '.'))
    setDraft(null)
    if (draft.trim() !== '' && Number.isFinite(parsed) && parsed !== Number(shown)) props.onCommit(props.min === undefined ? parsed : Math.max(props.min, parsed))
  }
  return (
    <span className={props.prefix ? 'nf-box has-prefix' : 'nf-box'}>
      {props.prefix && <i>{props.prefix}</i>}
      <input
        type="text"
        inputMode="decimal"
        value={draft ?? shown}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          else if (e.key === 'Escape') {
            setDraft(null)
            e.currentTarget.blur()
          }
        }}
      />
      {props.suffix && <em>{props.suffix}</em>}
    </span>
  )
}

/** One number: label on the left, box on the right. */
export function NumField(props: { label: ReactNode; value: number; suffix?: string; digits: number; min?: number; onCommit: (value: number) => void }) {
  return (
    <label className="fr">
      <span>{props.label}</span>
      <NumInput value={props.value} digits={props.digits} min={props.min} suffix={props.suffix} onCommit={props.onCommit} />
    </label>
  )
}

/** X, Y, Z of something on one row. */
export function NumTriple(props: { label: ReactNode; values: number[]; digits: number; onCommit: (axis: number, value: number) => void }) {
  return (
    <div className="fr">
      <span>{props.label}</span>
      <span className="triple">
        {['X', 'Y', 'Z'].map((axis, i) => (
          <NumInput key={axis} prefix={axis} value={props.values[i]} digits={props.digits} onCommit={(value) => props.onCommit(i, value)} />
        ))}
      </span>
    </div>
  )
}

/** Kept for call sites that group several fields; rows already stack on their own. */
export function NumRow({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function SelectField(props: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="fr">
      <span>{props.label}</span>
      <select value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/** On / off, drawn as the same small switch Settings uses. */
export function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="fr switch">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}
