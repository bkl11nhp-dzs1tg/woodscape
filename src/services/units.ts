import type { LengthUnit } from '../types/world'

/** Formats an internal length (meters) for display. */
export function formatLength(meters: number, unit: LengthUnit): string {
  switch (unit) {
    case 'm':
      return `${meters.toFixed(2)} m`
    case 'cm':
      return `${trim(meters * 100, 1)} cm`
    case 'mm':
      return `${Math.round(meters * 1000)} mm`
  }
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

function trim(value: number, digits: number): string {
  return String(Number(value.toFixed(digits)))
}
