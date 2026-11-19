import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { createObjectFromPreset, getShapePreset } from '../../data/shapePresets'
import { getTerrainHeight } from '../environment/terrain'
import { useEditorStore } from '../../stores/editorStore'
import { showToast } from '../../stores/toastStore'
import { useWorldStore, type ObjectPatch } from '../../stores/worldStore'
import type { Vec3, WorldObject } from '../../types/world'
import { executeCommand } from '../core/history'
import { createObjectId, patchCommand, roundMm } from './commands'
import { footprintOf } from './drawActions'
import { getWallHoles } from './openings'
import { worldAabb } from './snapping'
import { MAX_TILES, planTiles, type TileOptions, type TileSlot } from './tiling'

/** How a piece is oriented: the two axes (0=X 1=Y 2=Z) it is laid along, and its sizes on all three. */
export interface TileAxes {
  a: number
  b: number
  c: number
  sizes: [number, number, number]
}

/** Fill axes of a piece: by default its flat side (the thinnest axis is the one it is thick in). */
export function tileAxes(obj: WorldObject, across?: [number, number]): TileAxes | null {
  const g = obj.geometry
  if (g.shape !== 'box' && g.shape !== 'panel') return null
  const sizes: [number, number, number] = [g.width, g.height, g.shape === 'box' ? g.depth : g.thickness]
  const [a, b] = across ?? [0, 1, 2].filter((i) => i !== sizes.indexOf(Math.min(...sizes)))
  return { a, b, c: 3 - a - b, sizes }
}

export type FillOptions = Pick<TileOptions, 'gap' | 'pattern' | 'cutToFit'> & { areaU: number; areaV: number; groupName: string }

const SIZE_KEYS = ['width', 'height'] as const

interface Frame {
  /** Centre of the first piece. */
  position: Vec3
  rotation: Vec3
}

interface Laid {
  pieces: WorldObject[]
  cutCount: number
}

/**
 * Height and tilt for a flat piece lying on the terrain: it follows the slope under it and is lifted just
 * enough that none of its four corners is below the ground, so it props up on the high side instead of sinking.
 */
export function restOnTerrain(
  x: number,
  z: number,
  dirA: Vector3,
  dirB: Vector3,
  halfU: number,
  halfV: number,
  thickness: number,
  flat: Euler,
): { y: number; rotation: Vec3 } {
  const at = (u: number, v: number) => getTerrainHeight(x + dirA.x * u + dirB.x * v, z + dirA.z * u + dirB.z * v)
  const sA = (at(halfU, 0) - at(-halfU, 0)) / (2 * halfU)
  const sB = (at(0, halfV) - at(0, -halfV)) / (2 * halfV)
  const normal = new Vector3(-(sA * dirA.x + sB * dirB.x), 1, -(sA * dirA.z + sB * dirB.z)).normalize()
  // Surface height above the centre at a corner is sA*u + sB*v; the underside sits half a thickness lower along the normal.
  let y = -Infinity
  for (const [u, v] of [[-halfU, -halfV], [halfU, -halfV], [-halfU, halfV], [halfU, halfV]]) {
    y = Math.max(y, at(u, v) - (sA * u + sB * v) + thickness / 2 / normal.y)
  }
  const tilt = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal)
  const out = new Euler().setFromQuaternion(tilt.multiply(new Quaternion().setFromEuler(flat)))
  return { y, rotation: [out.x, out.y, out.z] }
}

/** Lays pieces over the area, growing from the first piece along its two fill axes. */
function layPieces(
  source: WorldObject,
  axes: TileAxes,
  frame: Frame,
  options: FillOptions,
  skip?: (slot: TileSlot) => boolean,
  groupName?: string,
  /** Rest each flat piece on the terrain: tilted to the slope and never below the ground. */
  onGround = false,
): Laid | string {
  const { a, b, sizes } = axes
  const plan = planTiles({ ...options, tileU: sizes[a], tileV: sizes[b] })
  const slots = skip ? plan.slots.filter((slot) => !skip(slot)) : plan.slots
  if (slots.length === 0) return 'Vùng quá nhỏ so với viên lát.'
  if (slots.length > MAX_TILES) return `Quá nhiều viên (${slots.length}). Thu nhỏ vùng hoặc dùng viên lớn hơn.`

  const rotation = new Euler(...frame.rotation)
  const basis = (axis: number) => new Vector3(axis === 0 ? 1 : 0, axis === 1 ? 1 : 0, axis === 2 ? 1 : 0).applyEuler(rotation)
  const dirA = basis(a)
  const dirB = basis(b)
  const [px, py, pz] = frame.position
  const groupId = createObjectId('group')
  const name = groupName?.trim() || options.groupName.trim() || `${source.name} (lát)`

  const keyFor = (axis: number) => (axis < 2 ? SIZE_KEYS[axis] : source.geometry.shape === 'box' ? 'depth' : 'thickness')
  const pieces = slots.map((slot): WorldObject => {
    const du = slot.u - sizes[a] / 2
    const dv = slot.v - sizes[b] / 2
    const centre = new Vector3(px + dirA.x * du + dirB.x * dv, py + dirA.y * du + dirB.y * dv, pz + dirA.z * du + dirB.z * dv)
    let rotationOut: Vec3 = [...frame.rotation]
    if (onGround && axes.c === 1) {
      const rest = restOnTerrain(centre.x, centre.z, dirA, dirB, slot.sizeU / 2, slot.sizeV / 2, sizes[1], rotation)
      centre.y = rest.y
      rotationOut = rest.rotation
    }
    return {
      ...structuredClone(source),
      id: createObjectId(source.type),
      locked: false,
      groupId,
      groupName: name,
      geometry: { ...source.geometry, [keyFor(a)]: roundMm(slot.sizeU), [keyFor(b)]: roundMm(slot.sizeV) } as WorldObject['geometry'],
      transform: { position: [roundMm(centre.x), roundMm(centre.y), roundMm(centre.z)], rotation: rotationOut },
    }
  })
  return { pieces, cutCount: slots.filter((slot) => slot.sizeU < sizes[a] - 1e-6 || slot.sizeV < sizes[b] - 1e-6).length }
}

/** Adds the laid pieces (and removes `removeId`, if given) as one undoable step, selects them and reports. */
function commit(laid: Laid | string, removeId: string | null, transient = false): string[] {
  if (typeof laid === 'string') {
    showToast(laid)
    return []
  }
  const { objects } = useWorldStore.getState()
  const before: ObjectPatch = {}
  const after: ObjectPatch = {}
  if (removeId && objects[removeId]) {
    // A transient source was never in the history, so undoing must remove it rather than bring it back.
    before[removeId] = transient ? null : objects[removeId]
    after[removeId] = null
  }
  for (const piece of laid.pieces) {
    before[piece.id] = null
    after[piece.id] = piece
  }
  executeCommand(patchCommand('FillArea', before, after))
  const ids = laid.pieces.map((piece) => piece.id)
  useEditorStore.setState({ selectedIds: ids })
  const name = laid.pieces[0].groupName
  showToast(
    `Đã lát ${ids.length} viên${laid.cutCount > 0 ? `, ${laid.cutCount} viên cắt cho vừa` : ''}. Nhóm "${name}" - hoàn tác một lần là gỡ hết.`,
  )
  return ids
}

/**
 * Replaces one piece with a field of pieces covering `areaU × areaV`, starting at
 * the corner of the original and growing along its two flat axes. One undoable
 * step, one named group, all selected afterwards.
 */
export function fillAreaWithTiles(sourceId: string, options: FillOptions): string[] {
  const source = useWorldStore.getState().objects[sourceId]
  const axes = source && tileAxes(source)
  if (!source || !axes) {
    showToast('Chỉ lát được từ một hộp hoặc tấm.')
    return []
  }
  return commit(layPieces(source, axes, source.transform, options), sourceId)
}

export interface GroundRect {
  x0: number
  x1: number
  z0: number
  z1: number
}

const QUARTER = Math.PI / 2

/**
 * Fills a rectangle on the ground with copies of `sourceId`. The piece is turned
 * to the nearest quarter turn so the pieces line up with the rectangle's edges.
 */
export function fillGroundRect(sourceId: string, rect: GroundRect, options: Omit<FillOptions, 'areaU' | 'areaV'> & { transientSource?: boolean }): string[] {
  const source = useWorldStore.getState().objects[sourceId]
  const axes = source && tileAxes(source)
  if (!source || !axes) {
    showToast('Chỉ lát được từ một hộp hoặc tấm.')
    return []
  }
  const [rx, ry, rz] = source.transform.rotation
  if (Math.abs(rx) > 0.05 || Math.abs(rz) > 0.05) {
    showToast('Viên lát đang nghiêng. Đặt lại góc xoay X, Z về 0 rồi thử lại.')
    return []
  }
  const yaw = Math.round(ry / QUARTER) * QUARTER
  const rotation: Vec3 = [rx, yaw, rz]
  const turned = new Euler(...rotation)
  const dirA = new Vector3(axes.a === 0 ? 1 : 0, axes.a === 1 ? 1 : 0, axes.a === 2 ? 1 : 0).applyEuler(turned).round()
  const dirB = new Vector3(axes.b === 0 ? 1 : 0, axes.b === 1 ? 1 : 0, axes.b === 2 ? 1 : 0).applyEuler(turned).round()
  const alongX = (dir: Vector3) => Math.abs(dir.x) > 0.5
  const areaU = alongX(dirA) ? rect.x1 - rect.x0 : rect.z1 - rect.z0
  const areaV = alongX(dirB) ? rect.x1 - rect.x0 : rect.z1 - rect.z0
  const cornerX = dirA.x + dirB.x > 0 ? rect.x0 : rect.x1
  const cornerZ = dirA.z + dirB.z > 0 ? rect.z0 : rect.z1
  const sa = axes.sizes[axes.a]
  const sb = axes.sizes[axes.b]
  const position: Vec3 = [
    cornerX + (dirA.x * sa + dirB.x * sb) / 2,
    source.transform.position[1],
    cornerZ + (dirA.z * sa + dirB.z * sb) / 2,
  ]
  return commit(layPieces(source, axes, { position, rotation }, { ...options, areaU, areaV }, undefined, undefined, true), sourceId, options.transientSource)
}

/** Which side of a box to cover. `up` takes whichever side faces most nearly upward. */
export type CoverFace = 'up' | 'front' | 'back' | 'left' | 'right' | 'top'

export const COVER_FACE_LABELS: Record<CoverFace, string> = {
  up: 'Mặt hướng lên trời nhất (mái)',
  front: 'Mặt trước (+Z)',
  back: 'Mặt sau (-Z)',
  right: 'Mặt phải (+X)',
  left: 'Mặt trái (-X)',
  top: 'Mặt trên (+Y)',
}

/** Face data in the box's own space: outward axis and sign, and the two axes the face spreads over. */
const FACE_FRAMES: Record<Exclude<CoverFace, 'up'>, { n: number; sign: 1 | -1; u: number; v: number }> = {
  front: { n: 2, sign: 1, u: 0, v: 1 },
  back: { n: 2, sign: -1, u: 0, v: 1 },
  right: { n: 0, sign: 1, u: 2, v: 1 },
  left: { n: 0, sign: -1, u: 2, v: 1 },
  top: { n: 1, sign: 1, u: 0, v: 2 },
}

/** Tile presets that suit cladding, with the axes that should face outward-flat (brick shows its long side). */
export const CLAD_TILES: { id: string; label: string; across?: [number, number]; pattern: 'grid' | 'bond' }[] = [
  { id: 'preset_brick', label: 'Gạch xây (so le)', across: [0, 1], pattern: 'bond' },
  { id: 'preset_shingle', label: 'Ngói (so le)', pattern: 'bond' },
  { id: 'preset_plank', label: 'Ván ốp', pattern: 'grid' },
  { id: 'preset_floor_tile', label: 'Gạch vuông', pattern: 'grid' },
]

/**
 * Covers one side of a box (a wall, a roof panel, a floor slab) with pieces of a tile preset,
 * laid flat on that side. On a wall, pieces that would hide a door or window are left out.
 */
export function coverFaceWithTiles(wallId: string, face: CoverFace, tileId: string, options: { gap: number; cutToFit: boolean; groupName: string }): string[] {
  const { objects } = useWorldStore.getState()
  const wall = objects[wallId]
  const clad = CLAD_TILES.find((tile) => tile.id === tileId)
  const preset = getShapePreset(tileId)
  if (!wall || !clad || !preset || (wall.geometry.shape !== 'box' && wall.geometry.shape !== 'panel')) {
    showToast('Chỉ ốp được lên mặt của hộp hoặc tấm.')
    return []
  }
  const wallSize = tileAxes(wall)!.sizes
  const wallRotation = new Euler(...wall.transform.rotation)

  let side: Exclude<CoverFace, 'up'> = face === 'up' ? 'top' : face
  if (face === 'up') {
    let best = -Infinity
    for (const key of Object.keys(FACE_FRAMES) as Exclude<CoverFace, 'up'>[]) {
      const f = FACE_FRAMES[key]
      const normal = new Vector3(f.n === 0 ? f.sign : 0, f.n === 1 ? f.sign : 0, f.n === 2 ? f.sign : 0).applyEuler(wallRotation)
      // Ties (walls) go to the larger face: a slab's broad side, a wall's front.
      const score = normal.y + 1e-3 * (wallSize[f.u] * wallSize[f.v])
      if (score > best) {
        best = score
        side = key
      }
    }
  }
  const frame = FACE_FRAMES[side]
  const tile = createObjectFromPreset(preset, 'tile', [0, 0, 0])
  const axes = tileAxes(tile, clad.across)!
  const { a, b, c, sizes } = axes

  // Wall space → piece orientation. Piece axes a, b, c map onto face directions u, v and outward n.
  const unit = (axis: number, sign = 1) => new Vector3(axis === 0 ? sign : 0, axis === 1 ? sign : 0, axis === 2 ? sign : 0)
  const u = unit(frame.u)
  const v = unit(frame.v)
  let n = unit(frame.n, frame.sign)
  const columns: Vector3[] = [new Vector3(), new Vector3(), new Vector3()]
  columns[a] = u
  columns[b] = v
  columns[c] = n
  const m = new Matrix4().makeBasis(columns[0], columns[1], columns[2])
  if (m.determinant() < 0) {
    columns[c] = n = n.clone().negate()
    m.makeBasis(columns[0], columns[1], columns[2])
  }
  const outward = unit(frame.n, frame.sign)
  const wallQuaternion = new Matrix4().makeRotationFromEuler(wallRotation)
  const world = wallQuaternion.clone().multiply(m)
  const rotation = new Euler().setFromRotationMatrix(world)

  const faceU = wallSize[frame.u]
  const faceV = wallSize[frame.v]
  // First piece centre in wall space: min corner of the face, pushed out by half the piece thickness.
  const local = new Vector3()
  local.addScaledVector(u, -faceU / 2 + sizes[a] / 2)
  local.addScaledVector(v, -faceV / 2 + sizes[b] / 2)
  local.addScaledVector(outward, wallSize[frame.n] / 2 + sizes[c] / 2)
  const position = local.applyMatrix4(wallQuaternion).add(new Vector3(...wall.transform.position))

  // Keep clear of doors and windows when covering the broad side of a wall.
  const holes = getWallHoles(objects)[wall.id]
  const holeAxis = holes?.thin === 'z' ? 2 : 0
  const skip =
    holes && frame.n === holeAxis
      ? (slot: TileSlot) => {
          // Slot centres are measured from the face's min corner along (a, b); convert to wall coordinates (u: along length, v: up).
          const wallU = frame.u === (holes.thin === 'z' ? 0 : 2) ? frame.u : -1
          if (wallU < 0) return false
          const centreU = (a === frame.u ? slot.u : slot.v) - faceU / 2
          const centreV = (a === frame.v ? slot.u : slot.v) - faceV / 2
          const halfU = (a === frame.u ? slot.sizeU : slot.sizeV) / 2
          const halfV = (a === frame.v ? slot.sizeU : slot.sizeV) / 2
          return holes.rects.some((r) => centreU + halfU > r.u0 && centreU - halfU < r.u1 && centreV + halfV > r.v0 && centreV - halfV < r.v1)
        }
      : undefined

  const laid = layPieces(
    tile,
    axes,
    { position: [position.x, position.y, position.z], rotation: [rotation.x, rotation.y, rotation.z] },
    { areaU: a === frame.u ? faceU : faceV, areaV: b === frame.v ? faceV : faceU, gap: options.gap, pattern: clad.pattern, cutToFit: options.cutToFit, groupName: options.groupName },
    skip,
    options.groupName.trim() || `${clad.label.replace(/ \(.*\)/, '')} ốp ${wall.name}`,
  )
  return commit(laid, null)
}

/** Lays a floor of `tileId` pieces inside the selected walls, level with their base. */
export function floorInsideWalls(wallIds: string[], tileId: string, options: { gap: number; groupName: string }): string[] {
  const { objects } = useWorldStore.getState()
  const walls = wallIds.map((id) => objects[id]).filter(Boolean)
  const preset = getShapePreset(tileId)
  const clad = CLAD_TILES.find((tile) => tile.id === tileId)
  const box = footprintOf(walls)
  if (!box || !preset || !clad) {
    showToast('Chọn các bức tường của một căn phòng trước.')
    return []
  }
  const base = Math.min(...walls.map((wall) => worldAabb(wall.geometry, wall.transform.position, wall.transform.rotation).min[1]))
  const thickness = Math.min(...walls.map((wall) => Math.min(...tileAxes(wall)?.sizes ?? [0.2])))
  const inset = thickness / 2
  const tile = createObjectFromPreset(preset, 'tile', [0, 0, 0])
  const axes = tileAxes(tile, clad.across && clad.across[1] === 1 ? undefined : clad.across)
  if (!axes) return []
  const rect = { x0: box.x0 + inset, x1: box.x1 - inset, z0: box.z0 + inset, z1: box.z1 - inset }
  tile.transform.position = [0, base + axes.sizes[1] / 2, 0]
  tile.transform.rotation = [0, 0, 0]
  const flat = tileAxes(tile)!
  // The floor is laid flat: the piece's thin axis must be vertical.
  if (flat.c !== 1) {
    showToast('Viên này không nằm phẳng được. Chọn ván hoặc gạch vuông.')
    return []
  }
  tile.transform.position = [0, base + flat.sizes[1] / 2, 0]
  const id = createObjectId(tile.type)
  tile.id = id
  const added = { ...tile }
  useWorldStore.getState().applyPatch({ [id]: added })
  const result = fillGroundRect(id, rect, { gap: options.gap, pattern: clad.pattern === 'bond' ? 'bond' : 'grid', cutToFit: true, groupName: options.groupName.trim() || 'Sàn', transientSource: true })
  if (result.length === 0) useWorldStore.getState().applyPatch({ [id]: null })
  return result
}

/**
 * Covers the outside of a cylinder or cone with pieces of a tile preset: rings of flat pieces turned to
 * follow the curve (on a cone the rings shrink toward the tip and lean with the slope).
 */
export function coverRoundWithTiles(targetId: string, tileId: string, options: { gap: number; groupName: string }): string[] {
  const { objects } = useWorldStore.getState()
  const target = objects[targetId]
  const clad = CLAD_TILES.find((tile) => tile.id === tileId)
  const preset = getShapePreset(tileId)
  const g = target?.geometry
  if (!target || !clad || !preset || (g?.shape !== 'cylinder' && g?.shape !== 'cone')) {
    showToast('Chỉ ốp tròn được lên khối trụ hoặc khối nón.')
    return []
  }
  const tile = createObjectFromPreset(preset, 'tile', [0, 0, 0])
  const axes = tileAxes(tile, clad.across)!
  const { a, b, c, sizes } = axes
  const [tileU, tileV, tileT] = [sizes[a], sizes[b], sizes[c]]
  const targetRotation = new Euler(...target.transform.rotation)
  const turn = new Matrix4().makeRotationFromEuler(targetRotation)
  const centre = new Vector3(...target.transform.position)
  const radius = g.radius
  const height = g.height
  const slant = g.shape === 'cone' ? Math.hypot(radius, height) : height
  const groupId = createObjectId('group')
  const name = options.groupName.trim() || `${preset.name} ốp ${target.name}`
  const pieces: WorldObject[] = []
  const rows = Math.max(1, Math.ceil(slant / (tileV + options.gap)))
  if (rows > 400) {
    showToast('Khối quá lớn so với viên ốp. Dùng viên lớn hơn.')
    return []
  }

  for (let row = 0; row < rows; row++) {
    const s = Math.min(slant - tileV / 2, row * (tileV + options.gap) + tileV / 2)
    // Distance along the surface from the base; the ring radius and the lean come from it.
    const ringRadius = g.shape === 'cone' ? radius * (1 - s / slant) : radius
    if (ringRadius < Math.max(0.12, tileU * 0.4)) break
    const around = Math.max(3, Math.round((2 * Math.PI * ringRadius) / (tileU + options.gap)))
    const rise = g.shape === 'cone' ? (s * height) / slant : s
    for (let k = 0; k < around; k++) {
      const theta = ((k + (row % 2) * 0.5) / around) * Math.PI * 2
      const tangent = new Vector3(-Math.sin(theta), 0, Math.cos(theta))
      const radial = new Vector3(Math.cos(theta), 0, Math.sin(theta))
      // Outward normal and the direction up the surface.
      const normal = g.shape === 'cone' ? radial.clone().multiplyScalar(height / slant).add(new Vector3(0, radius / slant, 0)) : radial.clone()
      const up = g.shape === 'cone' ? radial.clone().multiplyScalar(-radius / slant).add(new Vector3(0, height / slant, 0)) : new Vector3(0, 1, 0)
      const columns = [new Vector3(), new Vector3(), new Vector3()]
      columns[a] = tangent
      columns[b] = up
      columns[c] = normal.clone()
      const basis = new Matrix4().makeBasis(columns[0], columns[1], columns[2])
      if (basis.determinant() < 0) {
        columns[c] = normal.clone().negate()
        basis.makeBasis(columns[0], columns[1], columns[2])
      }
      const local = radial.clone().multiplyScalar(ringRadius).addScaledVector(normal, tileT / 2).add(new Vector3(0, -height / 2 + rise, 0))
      const position = local.applyMatrix4(turn).add(centre)
      const rotation = new Euler().setFromRotationMatrix(turn.clone().multiply(basis))
      pieces.push({
        ...structuredClone(tile),
        id: createObjectId(tile.type),
        groupId,
        groupName: name,
        locked: false,
        transform: { position: [roundMm(position.x), roundMm(position.y), roundMm(position.z)], rotation: [rotation.x, rotation.y, rotation.z] },
      })
      if (pieces.length > MAX_TILES) {
        showToast(`Quá nhiều viên (hơn ${MAX_TILES}). Dùng viên lớn hơn.`)
        return []
      }
    }
  }
  return commit({ pieces, cutCount: 0 }, null)
}
