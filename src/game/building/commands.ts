import { Euler, Quaternion, Vector3 } from 'three'
import { useEditorStore } from '../../stores/editorStore'
import { showToast } from '../../stores/toastStore'
import { useWorldStore, type ObjectPatch } from '../../stores/worldStore'
import type { BoxFace, GeometryParams, Paint, Vec3, WorldObject } from '../../types/world'
import { executeCommand, type Command } from '../core/history'
import { getDimensions } from '../geometry/GeometryFactory'

/**
 * Every edit to the world goes through these functions so it is undoable.
 * A command stores only the before/after state of the objects it touches.
 */

function pruneSelection(): void {
  const { objects } = useWorldStore.getState()
  const { selectedIds } = useEditorStore.getState()
  const kept = selectedIds.filter((id) => id in objects)
  if (kept.length !== selectedIds.length) useEditorStore.setState({ selectedIds: kept })
}

export function patchCommand(label: string, before: ObjectPatch, after: ObjectPatch): Command {
  const apply = (patch: ObjectPatch) => {
    useWorldStore.getState().applyPatch(patch)
    pruneSelection()
  }
  return { label, execute: () => apply(after), undo: () => apply(before) }
}

export function createObjectId(type: string): string {
  const random = Math.random().toString(36).slice(2, 8)
  return `${type}_${Date.now().toString(36)}${random}`
}

export function roundMm(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function addObject(obj: WorldObject): void {
  executeCommand(patchCommand('AddObject', { [obj.id]: null }, { [obj.id]: obj }))
}

/** Adds several objects as one undoable step. */
export function addObjects(objects: WorldObject[], label = 'AddObjects'): void {
  if (objects.length === 0) return
  const before: ObjectPatch = {}
  const after: ObjectPatch = {}
  for (const obj of objects) {
    before[obj.id] = null
    after[obj.id] = obj
  }
  executeCommand(patchCommand(label, before, after))
}

export function deleteObjects(ids: string[]): void {
  const { objects } = useWorldStore.getState()
  const before: ObjectPatch = {}
  const after: ObjectPatch = {}
  for (const id of ids) {
    if (!objects[id] || objects[id].locked) continue
    before[id] = objects[id]
    after[id] = null
  }
  const removed = Object.values(before)
  if (removed.length === 0) return
  executeCommand(patchCommand('DeleteObject', before, after))
  const what = removed.length === 1 ? `"${removed[0]?.name}"` : `${removed.length} vật thể`
  showToast(`Đã xoá ${what}`, { undo: true })
}

/** Applies a translucent coat of color, or removes it when `paint` is undefined. */
export function setPaint(id: string, paint: Paint | undefined): void {
  updateObject(id, 'PaintObject', (obj) => ({ ...obj, paint }))
}

/** Overrides how see-through the object is (1 = the material's own opacity is dropped). */
export function setOpacity(id: string, opacity: number | undefined): void {
  updateObject(id, 'ChangeOpacity', (obj) => ({ ...obj, opacity }))
}

const AXIS_INDEX = { x: 0, y: 1, z: 2 } as const

/**
 * Splits a box or panel in two across `axis`, `ratio` (0..1) of the way from
 * its low end. Both pieces keep the rotation, materials and paint and stay
 * exactly where the original was. Returns the new IDs, or null if it cannot be cut.
 */
export function cutObject(id: string, axis: 'x' | 'y' | 'z', ratio: number): [string, string] | null {
  const source = useWorldStore.getState().objects[id]
  if (!source || source.locked) return null
  const g = source.geometry
  if (g.shape !== 'box' && g.shape !== 'panel') return null
  const size = getDimensions(g)
  const lengths = [size.width, size.height, size.depth]
  const index = AXIS_INDEX[axis]
  const length = lengths[index]
  const first = roundMm(length * ratio)
  const second = roundMm(length - first)
  if (first < 0.005 || second < 0.005) return null

  const rotation = new Quaternion().setFromEuler(new Euler(...source.transform.rotation))
  const piece = (pieceLength: number, centerAlongAxis: number, suffix: string): WorldObject => {
    const offset = new Vector3().setComponent(index, centerAlongAxis).applyQuaternion(rotation)
    const dims = [...lengths]
    dims[index] = pieceLength
    const geometry: GeometryParams =
      g.shape === 'box'
        ? { shape: 'box', width: dims[0], height: dims[1], depth: dims[2] }
        : { shape: 'panel', width: dims[0], height: dims[1], thickness: dims[2] }
    const [x, y, z] = source.transform.position
    return {
      ...structuredClone(source),
      id: createObjectId(source.type),
      name: `${source.name} ${suffix}`,
      geometry,
      transform: {
        position: [roundMm(x + offset.x), roundMm(y + offset.y), roundMm(z + offset.z)],
        rotation: [...source.transform.rotation],
      },
    }
  }
  const a = piece(first, -length / 2 + first / 2, '(1)')
  const b = piece(second, -length / 2 + first + second / 2, '(2)')
  executeCommand(patchCommand('CutObject', { [id]: source, [a.id]: null, [b.id]: null }, { [id]: null, [a.id]: a, [b.id]: b }))
  return [a.id, b.id]
}

function updateObject(id: string, label: string, change: (obj: WorldObject) => WorldObject): void {
  const current = useWorldStore.getState().objects[id]
  if (!current) return
  const next = change(current)
  if (JSON.stringify(next) === JSON.stringify(current)) return
  executeCommand(patchCommand(label, { [id]: current }, { [id]: next }))
}

export function moveObject(id: string, position: Vec3): void {
  updateObject(id, 'MoveObject', (obj) => ({
    ...obj,
    transform: { ...obj.transform, position: position.map(roundMm) as Vec3 },
  }))
}

export function rotateObject(id: string, rotation: Vec3): void {
  updateObject(id, 'RotateObject', (obj) => ({ ...obj, transform: { ...obj.transform, rotation } }))
}

/**
 * Changes canonical dimensions. For an upright object the base stays where it
 * is when the height changes, so things resting on the ground keep resting.
 */
export function resizeObject(id: string, geometry: GeometryParams): void {
  updateObject(id, 'ResizeObject', (obj) => {
    const [x, y, z] = obj.transform.position
    const [rx, , rz] = obj.transform.rotation
    const upright = Math.abs(rx) < 1e-4 && Math.abs(rz) < 1e-4
    const grow = getDimensions(geometry).height - getDimensions(obj.geometry).height
    const position: Vec3 = upright ? [x, roundMm(y + grow / 2), z] : [x, y, z]
    return { ...obj, geometry, transform: { ...obj.transform, position } }
  })
}

export function renameObject(id: string, name: string): void {
  updateObject(id, 'RenameObject', (obj) => ({ ...obj, name }))
}

/** Applies one material to the whole object, clearing per-face overrides. */
export function setObjectMaterial(id: string, materialId: string): void {
  updateObject(id, 'ChangeMaterial', (obj) => ({ ...obj, materialId, faceMaterials: undefined }))
}

export function setFaceMaterial(id: string, face: BoxFace, materialId: string): void {
  updateObject(id, 'ChangeMaterial', (obj) => ({
    ...obj,
    faceMaterials: { ...obj.faceMaterials, [face]: materialId },
  }))
}

export interface TransformUpdate {
  id: string
  position: Vec3
  rotation: Vec3
}

/** Moves and/or turns several objects as one undoable step. */
export function transformObjects(updates: TransformUpdate[], label = 'MoveObject'): void {
  const { objects } = useWorldStore.getState()
  const before: ObjectPatch = {}
  const after: ObjectPatch = {}
  for (const update of updates) {
    const obj = objects[update.id]
    if (!obj || obj.locked) continue
    const next: WorldObject = {
      ...obj,
      transform: { position: update.position.map(roundMm) as Vec3, rotation: update.rotation },
    }
    if (JSON.stringify(next.transform) === JSON.stringify(obj.transform)) continue
    before[obj.id] = obj
    after[obj.id] = next
  }
  if (Object.keys(after).length > 0) executeCommand(patchCommand(label, before, after))
}

function updateMany(ids: string[], label: string, change: (obj: WorldObject) => WorldObject): void {
  const { objects } = useWorldStore.getState()
  const before: ObjectPatch = {}
  const after: ObjectPatch = {}
  for (const id of ids) {
    const obj = objects[id]
    if (!obj) continue
    const next = change(obj)
    if (JSON.stringify(next) === JSON.stringify(obj)) continue
    before[id] = obj
    after[id] = next
  }
  if (Object.keys(after).length > 0) executeCommand(patchCommand(label, before, after))
}

/** Coats (or strips) several objects in one undoable step. */
export function paintObjects(ids: string[], paint: Paint | undefined): void {
  updateMany(ids, 'PaintObject', (obj) => ({ ...obj, paint }))
}

/** Binds objects into one group that is selected and moved together. Returns the group ID. */
export function groupObjects(ids: string[]): string {
  const groupId = createObjectId('group')
  updateMany(ids, 'GroupObjects', (obj) => ({ ...obj, groupId }))
  return groupId
}

export function ungroupObjects(ids: string[]): void {
  updateMany(ids, 'UngroupObjects', (obj) => ({ ...obj, groupId: undefined }))
}

/** Copies several objects, offset to the side, as a new group of their own. Returns the new IDs. */
export function duplicateObjects(ids: string[]): string[] {
  const { objects } = useWorldStore.getState()
  const sources = ids.map((id) => objects[id]).filter(Boolean)
  if (sources.length === 0) return []
  const lows = sources.map((obj) => obj.transform.position[0] - getDimensions(obj.geometry).width / 2)
  const highs = sources.map((obj) => obj.transform.position[0] + getDimensions(obj.geometry).width / 2)
  const step = Math.max(0.3, Math.max(...highs) - Math.min(...lows) + 0.2)
  const groupId = sources.length > 1 ? createObjectId('group') : undefined
  const before: ObjectPatch = {}
  const after: ObjectPatch = {}
  for (const source of sources) {
    const [x, y, z] = source.transform.position
    const copy: WorldObject = {
      ...structuredClone(source),
      id: createObjectId(source.type),
      locked: false,
      groupId,
      transform: { position: [roundMm(x + step), y, z], rotation: [...source.transform.rotation] },
    }
    before[copy.id] = null
    after[copy.id] = copy
  }
  executeCommand(patchCommand('DuplicateObjects', before, after))
  return Object.keys(after)
}

/** Swings a door or window open or shut. */
export function toggleOpen(id: string): void {
  updateObject(id, 'ToggleOpen', (obj) => ({ ...obj, open: !obj.open }))
}

/** Adds a copy next to the original and returns its ID. */
export function duplicateObject(id: string): string | null {
  const source = useWorldStore.getState().objects[id]
  if (!source) return null
  const step = Math.max(0.3, getDimensions(source.geometry).width + 0.1)
  const [x, y, z] = source.transform.position
  const copy: WorldObject = {
    ...structuredClone(source),
    id: createObjectId(source.type),
    locked: false,
    transform: { position: [roundMm(x + step), y, z], rotation: [...source.transform.rotation] },
  }
  addObject(copy)
  return copy.id
}
