/**
 * Pieces that are being "built": they grow into place instead of appearing. The world data is already final
 * (every piece is a normal object that went through a normal command); this only drives how it looks for
 * a moment. `rise` lifts a wall up from the ground, `pop` swells a piece out from its middle.
 */
export type GrowthMode = 'rise' | 'pop'

export interface Growth {
  /** performance.now() at which this piece starts growing; before that it is not shown. */
  start: number
  duration: number
  mode: GrowthMode
}

export const growth = new Map<string, Growth>()

/** Marks pieces as growing, one after another `stagger` ms apart. */
export function startGrowth(ids: readonly string[], options: { mode?: GrowthMode; duration?: number; stagger?: number } = {}): void {
  const now = performance.now()
  const { mode = 'pop', duration = 450, stagger = 0 } = options
  ids.forEach((id, i) => growth.set(id, { start: now + i * stagger, duration, mode }))
}

export const easeOutBack = (t: number): number => {
  const c1 = 1.4
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}
