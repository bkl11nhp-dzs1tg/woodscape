import { Euler, Quaternion } from 'three'
import type { GeometryParams, Paint, Vec3 } from '../../types/world'

/**
 * Pure geometry for the Draw tool: turns a polyline drawn on the ground into
 * the editable parts of a wall, a fence or a path. No scene, no store, so it
 * can be tested on its own. Coordinates are meters, Y up; points are [x, z].
 */

export type Pt = [number, number]
export type DrawKind = 'wall' | 'fence' | 'path'

export interface DrawStyle {
  kind: DrawKind
  /** Wall and fence height (unused for paths). */
  height: number
  /** Wall thickness, or the width of a path (unused for fences). */
  thickness: number
  materialId: string
}

export interface DrawnPart {
  type: string
  name: string
  geometry: GeometryParams
  position: Vec3
  rotation: Vec3
  materialId: string
  faceMaterials?: Partial<Record<'top' | 'bottom', string>>
  paint?: Paint
}

export type GroundFn = (x: number, z: number) => number

export const DRAW_DEFAULTS: Record<DrawKind, DrawStyle> = {
  wall: { kind: 'wall', height: 2.6, thickness: 0.2, materialId: 'brick_red_painted' },
  fence: { kind: 'fence', height: 1, thickness: 0.1, materialId: 'oak_painted' },
  path: { kind: 'path', height: 0.05, thickness: 1.2, materialId: 'concrete_painted' },
}

const SNAP_ANGLE = Math.PI / 4
const SNAP_TOLERANCE = (6 * Math.PI) / 180
const FENCE_POST = 0.12
const FENCE_RAIL = 0.05
const PATH_PIECE = 2.5
const PATH_THICKNESS = 0.05

const round = (value: number) => Math.round(value * 1000) / 1000
const metres = (value: number) => value.toFixed(1).replace('.', ',')

/** Turns by `yaw` about the vertical axis, then tilts so the far end rises by `rise` over `run`. */
function yawAndTilt(yaw: number, rise: number, run: number): Vec3 {
  const turn = new Quaternion().setFromEuler(new Euler(0, yaw, 0))
  const tip = new Quaternion().setFromEuler(new Euler(-Math.atan2(rise, run), 0, 0))
  const euler = new Euler().setFromQuaternion(turn.multiply(tip), 'XYZ')
  return [euler.x, euler.y, euler.z]
}

const lerpPoint = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

/**
 * The parts for a drawn line. With `closed` the last point joins the first.
 * Walls overlap at corners without sharing a top surface: every segment is
 * trimmed at its start and extended at its end by half a thickness.
 */
export function buildDrawnParts(points: Pt[], closed: boolean, style: DrawStyle, ground: GroundFn): DrawnPart[] {
  const n = points.length
  const segments = closed ? n : n - 1
  const parts: DrawnPart[] = []
  for (let i = 0; i < segments; i++) {
    const a = points[i]
    const b = points[(i + 1) % n]
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    const length = Math.hypot(dx, dz)
    if (length < 0.05) continue
    const ux = dx / length
    const uz = dz / length
    const yaw = Math.atan2(dx, dz)
    if (style.kind === 'wall') parts.push(wallPart(a, ux, uz, yaw, length, i, segments, closed, style, ground))
    else if (style.kind === 'fence') parts.push(...fenceParts(a, b, ux, uz, yaw, length, i, segments, closed, style, ground))
    else parts.push(...pathParts(a, b, yaw, length, i, closed, style, ground))
  }
  if (style.kind === 'wall') parts.push(...cornerPillars(points, closed, style, ground))
  return parts
}

const RIGHT_ANGLE_TOLERANCE = (8 * Math.PI) / 180

/**
 * Walls that meet at an angle other than 90° leave a wedge-shaped gap on the
 * outside of the corner; a round pillar fills it.
 */
function cornerPillars(points: Pt[], closed: boolean, style: DrawStyle, ground: GroundFn): DrawnPart[] {
  const n = points.length
  const parts: DrawnPart[] = []
  for (let j = closed ? 0 : 1; j < (closed ? n : n - 1); j++) {
    const before = points[(j - 1 + n) % n]
    const at = points[j]
    const after = points[(j + 1) % n]
    const inx = at[0] - before[0]
    const inz = at[1] - before[1]
    const outx = after[0] - at[0]
    const outz = after[1] - at[1]
    if (Math.hypot(inx, inz) < 0.05 || Math.hypot(outx, outz) < 0.05) continue
    const turn = Math.abs(Math.atan2(inx * outz - inz * outx, inx * outx + inz * outz))
    // Straight runs and right angles need nothing.
    if (turn < RIGHT_ANGLE_TOLERANCE || Math.abs(turn - Math.PI / 2) < RIGHT_ANGLE_TOLERANCE) continue
    const g = ground(at[0], at[1])
    const height = style.height + 0.05
    parts.push({
      type: 'wall',
      name: 'Trụ góc tường',
      geometry: { shape: 'cylinder', radius: round(style.thickness * 0.62), height: round(height) },
      position: [round(at[0]), round(g - 0.05 + height / 2), round(at[1])],
      rotation: [0, 0, 0],
      materialId: style.materialId,
    })
  }
  return parts
}

function wallPart(a: Pt, ux: number, uz: number, yaw: number, length: number, i: number, segments: number, closed: boolean, style: DrawStyle, ground: GroundFn): DrawnPart {
  const t = style.thickness
  const trim = closed || i > 0 ? t / 2 : 0
  const extend = closed || i < segments - 1 ? t / 2 : 0
  const total = Math.max(0.05, length - trim + extend)
  const centre = trim + total / 2
  const cx = a[0] + ux * centre
  const cz = a[1] + uz * centre
  // The wall stands on the lowest ground under it and is taller by the slope, so no gap shows on a hillside.
  let low = Infinity
  let high = -Infinity
  for (let s = 0; s <= 4; s++) {
    const along = trim + (total * s) / 4
    const h = ground(a[0] + ux * along, a[1] + uz * along)
    low = Math.min(low, h)
    high = Math.max(high, h)
  }
  const buried = 0.05
  const height = style.height + (high - low) + buried
  return {
    type: 'wall',
    name: `Tường ${metres(length)} m`,
    geometry: { shape: 'box', width: t, height: round(height), depth: round(total) },
    position: [round(cx), round(low - buried + height / 2), round(cz)],
    rotation: [0, yaw, 0],
    materialId: style.materialId,
    faceMaterials: style.materialId === 'brick_red_painted' ? { top: 'concrete_painted', bottom: 'concrete_painted' } : undefined,
  }
}

function fenceParts(a: Pt, b: Pt, ux: number, uz: number, yaw: number, length: number, i: number, segments: number, closed: boolean, style: DrawStyle, ground: GroundFn): DrawnPart[] {
  const parts: DrawnPart[] = []
  const h = style.height
  const count = Math.max(1, Math.ceil(length / 2))
  for (let k = i === 0 ? 0 : 1; k <= count; k++) {
    // On a closed fence the last post is the first one again.
    if (closed && i === segments - 1 && k === count) continue
    const p = lerpPoint(a, b, k / count)
    const g = ground(p[0], p[1])
    parts.push({
      type: 'fence',
      name: 'Cột hàng rào',
      geometry: { shape: 'box', width: FENCE_POST, height: round(h), depth: FENCE_POST },
      position: [round(p[0]), round(g + h / 2 - 0.05), round(p[1])],
      rotation: [0, yaw, 0],
      materialId: style.materialId,
    })
  }
  const mid = lerpPoint(a, b, 0.5)
  const ga = ground(a[0], a[1])
  const gb = ground(b[0], b[1])
  const gm = ground(mid[0], mid[1])
  for (const fraction of [0.4, 0.8]) {
    parts.push({
      type: 'fence',
      name: 'Thanh hàng rào',
      geometry: { shape: 'box', width: FENCE_RAIL, height: 0.08, depth: round(length) },
      position: [round(mid[0]), round(gm + h * fraction), round(mid[1])],
      rotation: yawAndTilt(yaw, gb - ga, length),
      materialId: style.materialId,
    })
  }
  void ux
  void uz
  return parts
}

function pathParts(a: Pt, b: Pt, yaw: number, length: number, i: number, closed: boolean, style: DrawStyle, ground: GroundFn): DrawnPart[] {
  const parts: DrawnPart[] = []
  const width = style.thickness
  const pieces = Math.max(1, Math.round(length / PATH_PIECE))
  for (let k = 0; k < pieces; k++) {
    const p = lerpPoint(a, b, k / pieces)
    const q = lerpPoint(a, b, (k + 1) / pieces)
    const hp = ground(p[0], p[1])
    const hq = ground(q[0], q[1])
    const run = length / pieces
    parts.push({
      type: 'road',
      name: 'Đường đi',
      geometry: { shape: 'box', width, height: PATH_THICKNESS, depth: round(Math.hypot(run, hq - hp) + 0.02) },
      position: [round((p[0] + q[0]) / 2), round((hp + hq) / 2 + PATH_THICKNESS / 2 - 0.01), round((p[1] + q[1]) / 2)],
      rotation: yawAndTilt(yaw, hq - hp, run),
      materialId: style.materialId,
      paint: { color: '#d9c9a3', strength: 0.85 },
    })
  }
  // A square pad at every bend fills the gap between two angled pieces.
  if (i > 0 || closed) {
    parts.push({
      type: 'road',
      name: 'Đường đi',
      geometry: { shape: 'box', width, height: PATH_THICKNESS, depth: width },
      position: [round(a[0]), round(ground(a[0], a[1]) + PATH_THICKNESS / 2 - 0.008), round(a[1])],
      rotation: [0, 0, 0],
      materialId: style.materialId,
      paint: { color: '#d9c9a3', strength: 0.85 },
    })
  }
  return parts
}

/**
 * Keeps drawn lines neat: a point within a few degrees of a multiple of 45°
 * from the previous point is pulled onto that direction, and the distance is
 * rounded to the grid step.
 */
export function snapDirection(from: Pt, to: Pt, gridStep: number): Pt {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const length = Math.hypot(dx, dz)
  if (length < 1e-6) return to
  const angle = Math.atan2(dz, dx)
  const nearest = Math.round(angle / SNAP_ANGLE) * SNAP_ANGLE
  if (Math.abs(angle - nearest) > SNAP_TOLERANCE) return to
  // Diagonals are measured along the diagonal, not along each axis.
  const snapped = gridStep > 0 ? Math.max(gridStep, Math.round(length / gridStep) * gridStep) : length
  return [from[0] + Math.cos(nearest) * snapped, from[1] + Math.sin(nearest) * snapped]
}

/**
 * Pulls `to` onto the nearest of the eight straight directions (axes and 45°) from `from`,
 * whatever the angle; the length is rounded to the grid step.
 */
export function forceStraight(from: Pt, to: Pt, gridStep: number): Pt {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const length = Math.hypot(dx, dz)
  if (length < 1e-6) return to
  const nearest = Math.round(Math.atan2(dz, dx) / SNAP_ANGLE) * SNAP_ANGLE
  const snapped = gridStep > 0 ? Math.max(gridStep, Math.round(length / gridStep) * gridStep) : length
  return [from[0] + Math.cos(nearest) * snapped, from[1] + Math.sin(nearest) * snapped]
}
