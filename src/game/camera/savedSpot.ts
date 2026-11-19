/** Where the player was standing, kept in localStorage so a reload does not send them back to the start. */

export const SPOT_KEY = 'woodscape.camera.v1'

export interface SavedSpot {
  p: [number, number, number]
  /** The point the camera looks at (the orbit point in orbit mode). */
  t: [number, number, number]
  mode: 'walk' | 'orbit'
}

/** Forgets where the player stood (a new world starts at the beginning again). */
export function forgetSavedSpot(): void {
  try {
    localStorage.removeItem(SPOT_KEY)
  } catch {
    /* nothing to forget */
  }
}

export function loadSpot(): SavedSpot | null {
  try {
    const raw = localStorage.getItem(SPOT_KEY)
    if (!raw) return null
    const spot = JSON.parse(raw) as SavedSpot
    const ok = (v: unknown) => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n))
    return ok(spot.p) && ok(spot.t) && (spot.mode === 'walk' || spot.mode === 'orbit') ? spot : null
  } catch {
    return null
  }
}
