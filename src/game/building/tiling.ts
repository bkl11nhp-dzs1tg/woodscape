/**
 * Smart fill: lays copies of one small piece (floor plank, tile, brick, board)
 * side by side over a rectangular area. Pure maths, no stores.
 *
 * Coordinates are along the two long axes of the piece, measured from the
 * corner of the first piece: `u` runs along axis A, `v` along axis B.
 */

export type TilePattern = 'grid' | 'bond'

export interface TileSlot {
  /** Centre of the slot, relative to the corner of the area. */
  u: number
  v: number
  /** Size of the piece in this slot (shorter than the full piece where it is cut to fit). */
  sizeU: number
  sizeV: number
}

export interface TilePlan {
  slots: TileSlot[]
  /** Number of pieces that had to be cut shorter. */
  cutCount: number
}

export interface TileOptions {
  /** Full piece size along the two fill axes. */
  tileU: number
  tileV: number
  /** Area to cover along the same two axes. */
  areaU: number
  areaV: number
  /** Joint between pieces. */
  gap: number
  /** `grid`: joints line up. `bond`: every second row slides half a piece (planks, bricks). */
  pattern: TilePattern
  /** Cut the outermost pieces to end exactly on the edge. Otherwise only whole pieces are laid. */
  cutToFit: boolean
}

const EPS = 1e-6
/** A cut-off sliver thinner than this is not worth a piece. */
const MIN_PIECE = 0.02
export const MAX_TILES = 2000

/** 1D spans along one axis: whole pieces from `start`, clipped to [0, length] when cutting. */
function spans(start: number, tile: number, gap: number, length: number, cutToFit: boolean): [number, number][] {
  const out: [number, number][] = []
  const pitch = tile + gap
  for (let k = 0; k < MAX_TILES; k++) {
    const a = start + k * pitch
    const b = a + tile
    if (a >= length - EPS) break
    if (b <= EPS) continue
    if (a >= -EPS && b <= length + EPS) {
      out.push([Math.max(a, 0), Math.min(b, length)])
    } else if (cutToFit) {
      const lo = Math.max(a, 0)
      const hi = Math.min(b, length)
      if (hi - lo >= MIN_PIECE) out.push([lo, hi])
    }
  }
  return out
}

export function planTiles(options: TileOptions): TilePlan {
  const { tileU, tileV, areaU, areaV, gap, pattern, cutToFit } = options
  const slots: TileSlot[] = []
  let cutCount = 0
  if (tileU <= 0 || tileV <= 0 || areaU <= 0 || areaV <= 0) return { slots, cutCount }

  const rows = spans(0, tileV, gap, areaV, cutToFit)
  rows.forEach(([v0, v1], row) => {
    const shift = pattern === 'bond' && row % 2 === 1 ? -(tileU + gap) / 2 : 0
    for (const [u0, u1] of spans(shift, tileU, gap, areaU, cutToFit)) {
      const sizeU = u1 - u0
      const sizeV = v1 - v0
      if (sizeU < tileU - EPS || sizeV < tileV - EPS) cutCount++
      slots.push({ u: (u0 + u1) / 2, v: (v0 + v1) / 2, sizeU, sizeV })
    }
  })
  return { slots, cutCount }
}
