import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { Paint, Vec3, WorldObject } from '../../types/world'

/**
 * Automatic gable roof for a set of objects (the walls of a room): measures
 * their combined footprint and puts two tiled roof boards, a ridge cap and the
 * two gable triangles on top, ridge along the longer side. Pure data in and
 * out, so it can be tested without a scene.
 */

export type Slope = 'z+' | 'z-' | 'x+' | 'x-'

export const SLOPE_VECTORS: Record<Slope, [number, number]> = { 'z+': [0, 1], 'z-': [0, -1], 'x+': [1, 0], 'x-': [-1, 0] }

const ROOF_THICKNESS = 0.1
const GABLE_THICKNESS = 0.2
const OVERHANG = 0.45
const rad = (degrees: number) => (degrees * Math.PI) / 180
const round = (value: number) => Math.round(value * 1000) / 1000

/**
 * Rotation of a roof board whose local +Z runs DOWN the slope toward `dir`.
 * The tile texture's rows stack along local Z, so every board sheds water the right way.
 */
export function slopeRotation(dir: Slope, pitch: number): Vec3 {
  const a = rad(pitch)
  const turn = (x: number, y: number, z: number) => new Quaternion().setFromEuler(new Euler(x, y, z))
  const q =
    dir === 'z+' ? turn(a, 0, 0)
    : dir === 'z-' ? turn(-a, 0, 0).multiply(turn(0, Math.PI, 0))
    : dir === 'x+' ? turn(0, 0, -a).multiply(turn(0, Math.PI / 2, 0))
    : turn(0, 0, a).multiply(turn(0, -Math.PI / 2, 0))
  const euler = new Euler().setFromQuaternion(q, 'XYZ')
  return [euler.x, euler.y, euler.z]
}

export interface RoofPart {
  type: string
  name: string
  geometry: WorldObject['geometry']
  position: Vec3
  rotation: Vec3
  materialId: string
  paint?: Paint
}

export interface Footprint {
  x0: number
  x1: number
  z0: number
  z1: number
  /** Height of the top of the walls. */
  top: number
}

export type RoofKind = 'gable' | 'hip' | 'flat'

/** Panel of a hip roof: a flat outline (x along the eave, y up the slope) standing on the slope. */
function hipPanel(name: string, eave: Vector3, outward: [number, number], pitch: number, outline: [number, number][]): RoofPart {
  const a = rad(pitch)
  const d = new Vector3(outward[0], 0, outward[1])
  const up = new Vector3(0, 1, 0)
  const z = d.clone().multiplyScalar(Math.sin(a)).add(up.clone().multiplyScalar(Math.cos(a)))
  const y = d.clone().multiplyScalar(-Math.cos(a)).add(up.clone().multiplyScalar(Math.sin(a)))
  const x = new Vector3().crossVectors(y, z)
  const euler = new Euler().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z), 'XYZ')
  // The outline is re-centred so the object's centre is the middle of its bounding box.
  const xs = outline.map((q) => q[0])
  const ys = outline.map((q) => q[1])
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  const centre = eave.clone().addScaledVector(x, cx).addScaledVector(y, cy).addScaledVector(z, ROOF_THICKNESS / 2)
  return {
    type: 'roof',
    name,
    geometry: { shape: 'extrude', points: outline.map(([u, v]) => [round(u - cx), round(v - cy)] as [number, number]), depth: ROOF_THICKNESS },
    position: [round(centre.x), round(centre.y), round(centre.z)],
    rotation: [euler.x, euler.y, euler.z],
    materialId: 'roof_terracotta_painted',
  }
}

export function buildRoofParts(box: Footprint, pitch: number, gable: { materialId: string; paint?: Paint }, kind: RoofKind = 'gable'): RoofPart[] {
  if (kind === 'flat') return flatRoof(box)
  if (kind === 'hip') return hipRoof(box, pitch)
  return gableRoof(box, pitch, gable)
}

function flatRoof(box: Footprint): RoofPart[] {
  const over = 0.25
  const thick = 0.2
  return [
    {
      type: 'roof',
      name: 'Mái bằng',
      geometry: { shape: 'box', width: round(box.x1 - box.x0 + over * 2), height: thick, depth: round(box.z1 - box.z0 + over * 2) },
      position: [round((box.x0 + box.x1) / 2), round(box.top + thick / 2), round((box.z0 + box.z1) / 2)],
      rotation: [0, 0, 0],
      materialId: 'concrete_painted',
    },
  ]
}

function hipRoof(box: Footprint, pitch: number): RoofPart[] {
  const a = rad(pitch)
  const x0 = box.x0 - OVERHANG
  const x1 = box.x1 + OVERHANG
  const z0 = box.z0 - OVERHANG
  const z1 = box.z1 + OVERHANG
  const eaveY = box.top - OVERHANG * Math.tan(a)
  const xm = (x0 + x1) / 2
  const zm = (z0 + z1) / 2
  const alongX = x1 - x0 >= z1 - z0
  const long = alongX ? x1 - x0 : z1 - z0
  const span = alongX ? z1 - z0 : x1 - x0
  const half = (long - span) / 2 // half the ridge length (0 for a pyramid)
  const slope = span / 2 / Math.cos(a)
  const ridgeY = eaveY + (span / 2) * Math.tan(a)
  const parts: RoofPart[] = []

  // Long sides are trapezoids (triangles when the roof is square); the two ends are triangles.
  const side: [number, number][] =
    half > 0.02 ? [[-long / 2, 0], [long / 2, 0], [half, slope], [-half, slope]] : [[-long / 2, 0], [long / 2, 0], [0, slope]]
  const end: [number, number][] = [[-span / 2, 0], [span / 2, 0], [0, slope]]
  const faces: { name: string; at: [number, number]; out: [number, number]; outline: [number, number][] }[] = alongX
    ? [
        { name: 'Mái trước', at: [xm, z1], out: [0, 1], outline: side },
        { name: 'Mái sau', at: [xm, z0], out: [0, -1], outline: side },
        { name: 'Mái hông phải', at: [x1, zm], out: [1, 0], outline: end },
        { name: 'Mái hông trái', at: [x0, zm], out: [-1, 0], outline: end },
      ]
    : [
        { name: 'Mái phải', at: [x1, zm], out: [1, 0], outline: side },
        { name: 'Mái trái', at: [x0, zm], out: [-1, 0], outline: side },
        { name: 'Mái hông trước', at: [xm, z1], out: [0, 1], outline: end },
        { name: 'Mái hông sau', at: [xm, z0], out: [0, -1], outline: end },
      ]
  for (const face of faces) parts.push(hipPanel(face.name, new Vector3(face.at[0], eaveY, face.at[1]), face.out, pitch, face.outline))
  if (half > 0.02) {
    parts.push({
      type: 'roof',
      name: 'Nóc mái',
      geometry: alongX
        ? { shape: 'box', width: round(half * 2 + 0.3), height: 0.14, depth: 0.34 }
        : { shape: 'box', width: 0.34, height: 0.14, depth: round(half * 2 + 0.3) },
      position: [round(xm), round(ridgeY + 0.1), round(zm)],
      rotation: [0, 0, 0],
      materialId: 'roof_terracotta_painted',
      paint: { color: '#e08a3c', strength: 0.9 },
    })
  }
  return parts
}

function gableRoof(box: Footprint, pitch: number, gable: { materialId: string; paint?: Paint }): RoofPart[] {
  const { x0, x1, z0, z1, top } = box
  const alongX = x1 - x0 >= z1 - z0
  const a = rad(pitch)
  const half = (alongX ? z1 - z0 : x1 - x0) / 2
  const rise = half * Math.tan(a)
  const length = half / Math.cos(a) + OVERHANG
  const xm = (x0 + x1) / 2
  const zm = (z0 + z1) / 2
  const width = (alongX ? x1 - x0 : z1 - z0) + 2 * OVERHANG
  const parts: RoofPart[] = []

  const plane = (name: string, dir: Slope) => {
    const [hx, hz] = SLOPE_VECTORS[dir]
    const along = length / 2
    const out = Math.cos(a) * along + (Math.sin(a) * ROOF_THICKNESS) / 2
    parts.push({
      type: 'roof',
      name,
      geometry: { shape: 'box', width: round(width), height: ROOF_THICKNESS, depth: round(length) },
      position: [round(xm + hx * out), round(top + rise - Math.sin(a) * along + (Math.cos(a) * ROOF_THICKNESS) / 2), round(zm + hz * out)],
      rotation: slopeRotation(dir, pitch),
      materialId: 'roof_terracotta_painted',
    })
  }
  if (alongX) {
    plane('Mái trước', 'z+')
    plane('Mái sau', 'z-')
  } else {
    plane('Mái phải', 'x+')
    plane('Mái trái', 'x-')
  }
  parts.push({
    type: 'roof',
    name: 'Nóc mái',
    geometry: alongX
      ? { shape: 'box', width: round(width), height: 0.14, depth: 0.34 }
      : { shape: 'box', width: 0.34, height: 0.14, depth: round(width) },
    position: [round(xm), round(top + rise + 0.1), round(zm)],
    rotation: [0, 0, 0],
    materialId: 'roof_terracotta_painted',
    paint: { color: '#e08a3c', strength: 0.9 },
  })
  // The two triangles that close the ends of the roof.
  for (const side of [0, 1]) {
    parts.push({
      type: 'wall',
      name: 'Đầu hồi',
      geometry: { shape: 'prism', width: round(half * 2), height: round(rise), depth: GABLE_THICKNESS },
      position: alongX
        ? [round(side ? x1 - GABLE_THICKNESS / 2 : x0 + GABLE_THICKNESS / 2), round(top + rise / 2), round(zm)]
        : [round(xm), round(top + rise / 2), round(side ? z1 - GABLE_THICKNESS / 2 : z0 + GABLE_THICKNESS / 2)],
      rotation: alongX ? [0, Math.PI / 2, 0] : [0, 0, 0],
      materialId: gable.materialId,
      paint: gable.paint,
    })
  }
  return parts
}
