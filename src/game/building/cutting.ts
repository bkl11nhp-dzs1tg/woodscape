import { Euler, Quaternion, Vector3 } from 'three'
import { useWorldStore } from '../../stores/worldStore'
import type { GeometryParams, Vec3, WorldObject } from '../../types/world'
import { executeCommand } from '../core/history'
import { getDimensions } from '../geometry/GeometryFactory'
import { createObjectId, patchCommand, roundMm } from './commands'

/**
 * Free cutting. A box, panel or already-cut piece is treated as a flat outline
 * (a polygon) pushed through a thickness. Cutting along a drawn line splits the
 * outline in two; cutting out a shape adds a hole to it. Results are ordinary
 * parametric objects (`extrude`), so they can be cut again, painted and moved.
 */

export type Point = [number, number]
export type CutShape = 'rect' | 'circle' | 'triangle'
/** Which local axis of the object the cut goes through: 0 = X, 1 = Y, 2 = Z. */
export type CutAxis = 0 | 1 | 2

/** Local 3D point on the object -> 2D point in the cutting plane for that axis. */
export function toPlane(axis: CutAxis, p: { x: number; y: number; z: number }): Point {
  if (axis === 2) return [p.x, p.y]
  if (axis === 0) return [-p.z, p.y]
  return [p.x, -p.z]
}

/** 2D point in the cutting plane (+ distance `w` along the cut axis) -> local 3D point. */
export function fromPlane(axis: CutAxis, [u, v]: Point, w: number): Vec3 {
  if (axis === 2) return [u, v, w]
  if (axis === 0) return [w, v, -u]
  return [u, w, -v]
}

/** Turns the cutting-plane frame (outline in XY, thickness along Z) into the object's own frame. */
function planeRotation(axis: CutAxis): Quaternion {
  if (axis === 2) return new Quaternion()
  return new Quaternion().setFromEuler(axis === 0 ? new Euler(0, Math.PI / 2, 0) : new Euler(-Math.PI / 2, 0, 0))
}

interface Outline {
  points: Point[]
  holes: Point[][]
  depth: number
}

/** The object's outline as seen along `axis`, or null if it cannot be cut that way. */
export function outlineOf(obj: WorldObject, axis: CutAxis): Outline | null {
  const g = obj.geometry
  if (g.shape === 'extrude') return axis === 2 ? { points: g.points, holes: g.holes ?? [], depth: g.depth } : null
  if (g.shape !== 'box' && g.shape !== 'panel') return null
  const size = getDimensions(g)
  const [a, b, depth] =
    axis === 2 ? [size.width, size.height, size.depth] : axis === 0 ? [size.depth, size.height, size.width] : [size.width, size.depth, size.height]
  return { points: [[-a / 2, -b / 2], [a / 2, -b / 2], [a / 2, b / 2], [-a / 2, b / 2]], holes: [], depth }
}

/** Splits a convex polygon along the infinite line through `p0` and `p1`. */
export function splitPolygon(points: Point[], p0: Point, p1: Point): [Point[], Point[]] | null {
  const dx = p1[0] - p0[0]
  const dy = p1[1] - p0[1]
  if (Math.hypot(dx, dy) < 1e-6) return null
  const side = (p: Point) => dx * (p[1] - p0[1]) - dy * (p[0] - p0[0])
  const left: Point[] = []
  const right: Point[] = []
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const sa = side(a)
    const sb = side(b)
    if (sa >= 0) left.push(a)
    if (sa <= 0) right.push(a)
    if ((sa > 0 && sb < 0) || (sa < 0 && sb > 0)) {
      const t = sa / (sa - sb)
      const cut: Point = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
      left.push(cut)
      right.push(cut)
    }
  }
  const area = (poly: Point[]) => Math.abs(poly.reduce((sum, p, i) => sum + p[0] * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * p[1], 0)) / 2
  return left.length >= 3 && right.length >= 3 && area(left) > 1e-5 && area(right) > 1e-5 ? [left, right] : null
}

export function shapePoints(shape: CutShape, center: Point, width: number, height: number): Point[] {
  const [cx, cy] = center
  if (shape === 'rect') return [[cx - width / 2, cy - height / 2], [cx + width / 2, cy - height / 2], [cx + width / 2, cy + height / 2], [cx - width / 2, cy + height / 2]]
  if (shape === 'triangle') return [[cx - width / 2, cy - height / 2], [cx + width / 2, cy - height / 2], [cx, cy + height / 2]]
  return Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * Math.PI * 2
    return [cx + (Math.cos(angle) * width) / 2, cy + (Math.sin(angle) * height) / 2] as Point
  })
}

/** Builds a piece from an outline given in the source object's cutting plane. */
function makePiece(source: WorldObject, axis: CutAxis, outline: Outline, suffix: string): WorldObject {
  const xs = outline.points.map((p) => p[0])
  const ys = outline.points.map((p) => p[1])
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  const shift = (list: Point[]) => list.map(([x, y]) => [roundMm(x - cx), roundMm(y - cy)] as Point)
  const rotation = new Quaternion().setFromEuler(new Euler(...source.transform.rotation)).multiply(planeRotation(axis))
  const offset = new Vector3(cx, cy, 0).applyQuaternion(rotation)
  const euler = new Euler().setFromQuaternion(rotation, 'XYZ')
  const [x, y, z] = source.transform.position
  const geometry: GeometryParams = { shape: 'extrude', points: shift(outline.points), depth: outline.depth }
  if (outline.holes.length > 0) geometry.holes = outline.holes.map(shift)
  return {
    ...structuredClone(source),
    id: createObjectId(source.type),
    name: `${source.name}${suffix}`,
    geometry,
    faceMaterials: undefined,
    transform: { position: [roundMm(x + offset.x), roundMm(y + offset.y), roundMm(z + offset.z)], rotation: [euler.x, euler.y, euler.z] },
  }
}

function replace(source: WorldObject, pieces: WorldObject[], label: string): string[] {
  const before = { [source.id]: source, ...Object.fromEntries(pieces.map((piece) => [piece.id, null])) }
  const after = { [source.id]: null, ...Object.fromEntries(pieces.map((piece) => [piece.id, piece])) }
  executeCommand(patchCommand(label, before, after))
  return pieces.map((piece) => piece.id)
}

/** Cuts straight through the object along the line drawn between two points on its face. */
export function cutAlongLine(id: string, axis: CutAxis, p0: Point, p1: Point): string[] | null {
  const source = useWorldStore.getState().objects[id]
  const outline = source && !source.locked ? outlineOf(source, axis) : null
  if (!source || !outline || outline.holes.length > 0) return null
  const halves = splitPolygon(outline.points, p0, p1)
  if (!halves) return null
  return replace(
    source,
    halves.map((points, i) => makePiece(source, axis, { points, holes: [], depth: outline.depth }, ` (${i + 1})`)),
    'CutObject',
  )
}

/** Cuts a shape out of the object. With `keepPlug` the removed piece stays as its own object. */
export function cutOutShape(id: string, axis: CutAxis, hole: Point[], keepPlug: boolean): string[] | null {
  const source = useWorldStore.getState().objects[id]
  const outline = source && !source.locked ? outlineOf(source, axis) : null
  if (!source || !outline) return null
  const pieces = [makePiece(source, axis, { ...outline, holes: [...outline.holes, hole] }, '')]
  if (keepPlug) pieces.push(makePiece(source, axis, { points: hole, holes: [], depth: outline.depth }, ' (miếng cắt)'))
  return replace(source, pieces, 'CutObject')
}
