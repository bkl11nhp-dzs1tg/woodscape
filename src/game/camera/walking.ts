import type { WorldObject } from '../../types/world'
import { getDimensions } from '../geometry/GeometryFactory'

/**
 * Walking like a person: the eye stays a fixed height above whatever is underfoot (ground, floor, a stair
 * tread), steps up and down small rises, falls off ledges and can jump. Used when "no walking through
 * things" is on; with it off the camera still flies freely.
 */

export const EYE_HEIGHT = 1.7
/** The highest rise a foot steps up without jumping. */
export const MAX_STEP = 0.7
const GRAVITY = 22
const JUMP_SPEED = 5.2
/** A little give at the edge of a floor, so standing right at the rim still counts as standing on it. */
const EDGE = 0.12

const SOLID_SHAPES = new Set(['box', 'panel'])

/** Height of the highest surface under (x, z) that a person could stand on from the current eye height, or null. */
export function groundHeightAt(x: number, z: number, eyeY: number, objects: readonly WorldObject[]): number | null {
  const reach = eyeY - EYE_HEIGHT + MAX_STEP
  let best: number | null = null
  for (const obj of objects) {
    if (!SOLID_SHAPES.has(obj.geometry.shape) || obj.type === 'mark_line') continue
    const [rx, ry, rz] = obj.transform.rotation
    if (Math.abs(rx) > 0.05 || Math.abs(rz) > 0.05) continue
    const size = getDimensions(obj.geometry)
    const [px, py, pz] = obj.transform.position
    const top = py + size.height / 2
    if (top > reach || (best !== null && top <= best)) continue
    const dx = x - px
    const dz = z - pz
    const cos = Math.cos(ry)
    const sin = Math.sin(ry)
    // Into the piece's own axes (a turn about the vertical axis only).
    const lx = dx * cos - dz * sin
    const lz = dx * sin + dz * cos
    if (Math.abs(lx) <= size.width / 2 + EDGE && Math.abs(lz) <= size.depth / 2 + EDGE) best = top
  }
  return best
}

export interface VerticalState {
  y: number
  vy: number
  grounded: boolean
}

/** One frame of standing, stepping, falling and jumping. `floorEye` is where the eye would be standing here. */
export function stepVertical(y: number, vy: number, floorEye: number, dt: number, jump: boolean): VerticalState {
  const grounded = y - floorEye < 0.06 && vy <= 0.01
  let velocity = vy
  if (jump && grounded) velocity = JUMP_SPEED
  velocity -= GRAVITY * dt
  let next = y + velocity * dt
  if (next < floorEye) {
    // Up onto a step: glide up rather than snapping, which would jerk on every tread.
    if (floorEye - y > 0.004 && velocity <= 0) {
      next = y + (floorEye - y) * Math.min(1, dt * 18)
      if (floorEye - next < 0.004) next = floorEye
      velocity = 0
    } else {
      next = floorEye
      velocity = 0
    }
  }
  return { y: next, vy: velocity, grounded: next - floorEye < 0.06 }
}
