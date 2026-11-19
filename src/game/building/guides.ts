import type { Vec3 } from '../../types/world'
import type { Aabb } from './snapping'

/**
 * Alignment guides shown while dragging: when a face or the middle of the moving piece lines up with a face
 * or middle of another piece, a line links the two. Pure maths so it can be tested on its own.
 */
export interface Guide {
  /** The axis (0 X, 1 Y, 2 Z) whose coordinate is shared. */
  axis: 0 | 1 | 2
  /** The shared coordinate. */
  value: number
  /** End points of the line that links the two pieces. */
  from: Vec3
  to: Vec3
  /** What lined up: a face of both, or the middles. */
  kind: 'edge' | 'centre'
}

/** Pieces further apart than this on the other axes do not get a guide. */
const REACH = 8
export const GUIDE_TOLERANCE = 0.06

const features = (box: Aabb, axis: number): [number, 'edge' | 'centre'][] => [
  [box.min[axis], 'edge'],
  [box.max[axis], 'edge'],
  [(box.min[axis] + box.max[axis]) / 2, 'centre'],
]

/** At most one guide per axis: the closest alignment within `tolerance`. */
export function findGuides(moving: Aabb, others: readonly Aabb[], tolerance = GUIDE_TOLERANCE): Guide[] {
  const guides: Guide[] = []
  for (const axis of [0, 1, 2] as const) {
    const a = (axis + 1) % 3
    const b = (axis + 2) % 3
    let best: { delta: number; guide: Guide } | null = null
    for (const other of others) {
      if (moving.min[a] > other.max[a] + REACH || moving.max[a] < other.min[a] - REACH) continue
      if (moving.min[b] > other.max[b] + REACH || moving.max[b] < other.min[b] - REACH) continue
      for (const [mine, mineKind] of features(moving, axis)) {
        for (const [theirs, theirKind] of features(other, axis)) {
          if (mineKind !== theirKind) continue
          const delta = Math.abs(mine - theirs)
          if (delta > tolerance || (best && delta >= best.delta)) continue
          // The line runs along axis `a` between the two pieces, at the moving piece's middle on axis `b`.
          const lo = Math.min(moving.min[a], other.min[a])
          const hi = Math.max(moving.max[a], other.max[a])
          const centreB = (moving.min[b] + moving.max[b]) / 2
          const from: Vec3 = [0, 0, 0]
          const to: Vec3 = [0, 0, 0]
          from[axis] = to[axis] = theirs
          from[a] = lo
          to[a] = hi
          from[b] = to[b] = centreB
          best = { delta, guide: { axis, value: theirs, from, to, kind: mineKind } }
        }
      }
    }
    if (best) guides.push(best.guide)
  }
  return guides
}

/** Bounding box of several boxes. */
export function unionAabb(boxes: readonly Aabb[]): Aabb {
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (const box of boxes) {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], box.min[i])
      max[i] = Math.max(max[i], box.max[i])
    }
  }
  return { min, max }
}
