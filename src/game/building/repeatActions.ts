import { Euler, Quaternion, Vector3 } from 'three'
import { useEditorStore } from '../../stores/editorStore'
import { showToast } from '../../stores/toastStore'
import { useWorldStore, type ObjectPatch } from '../../stores/worldStore'
import type { Vec3, WorldObject } from '../../types/world'
import { executeCommand } from '../core/history'
import { createObjectId, patchCommand, roundMm } from './commands'
import { MAX_TILES } from './tiling'
import { worldAabb } from './snapping'

/** Repeating a cluster (a column with its wall bay, a window with its frame…) along a line or around a circle. */

export type RepeatAxis = 'x' | 'y' | 'z'

export interface Bounds {
  min: Vec3
  max: Vec3
  centre: Vec3
}

export function boundsOf(objects: readonly WorldObject[]): Bounds | null {
  if (objects.length === 0) return null
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (const obj of objects) {
    const box = worldAabb(obj.geometry, obj.transform.position, obj.transform.rotation)
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], box.min[i])
      max[i] = Math.max(max[i], box.max[i])
    }
  }
  return { min, max, centre: [0, 1, 2].map((i) => (min[i] + max[i]) / 2) as Vec3 }
}

function selected(ids: string[]): WorldObject[] {
  const { objects } = useWorldStore.getState()
  return ids.map((id) => objects[id]).filter((obj): obj is WorldObject => Boolean(obj))
}

function addCopies(sources: WorldObject[], copyCount: number, place: (source: WorldObject, copy: number) => { position: Vec3; rotation: Vec3 }, label: string, groupName: string): string[] {
  if (sources.length * copyCount > MAX_TILES) {
    showToast(`Quá nhiều bản (${sources.length * copyCount}). Giảm số lần lặp.`)
    return []
  }
  const groupId = createObjectId('group')
  const before: ObjectPatch = {}
  const after: ObjectPatch = {}
  for (let copy = 1; copy <= copyCount; copy++) {
    for (const source of sources) {
      const { position, rotation } = place(source, copy)
      const piece: WorldObject = {
        ...structuredClone(source),
        id: createObjectId(source.type),
        locked: false,
        groupId,
        groupName,
        transform: { position, rotation },
      }
      before[piece.id] = null
      after[piece.id] = piece
    }
  }
  executeCommand(patchCommand(label, before, after))
  const ids = Object.keys(after)
  useEditorStore.setState({ selectedIds: ids })
  showToast(`Đã lặp thêm ${copyCount} lần (${ids.length} vật). Nhóm "${groupName}". Hoàn tác một lần là gỡ hết.`)
  return ids
}

/** Default spacing for a line: the cluster's own length on that axis, so copies sit edge to edge. */
export function defaultStep(ids: string[], axis: RepeatAxis): number {
  const bounds = boundsOf(selected(ids))
  if (!bounds) return 1
  const i = { x: 0, y: 1, z: 2 }[axis]
  return roundMm(bounds.max[i] - bounds.min[i])
}

/** `count` extra copies of the selection, each moved `step` further along a world axis. */
export function repeatInLine(ids: string[], count: number, axis: RepeatAxis, step: number, name: string): string[] {
  const sources = selected(ids)
  if (sources.length === 0 || count < 1 || step === 0) return []
  const i = { x: 0, y: 1, z: 2 }[axis]
  const label = name.trim() || `${sources[0].groupName ?? sources[0].name} (lặp)`
  return addCopies(
    sources,
    count,
    (source, copy) => {
      const position = [...source.transform.position] as Vec3
      position[i] = roundMm(position[i] + step * copy)
      return { position, rotation: [...source.transform.rotation] }
    },
    'RepeatInLine',
    label,
  )
}

/**
 * Copies of the selection placed around a circle. The cluster sits on the circle
 * at `radius` from the centre, which lies toward `-X` of it; each copy turns with its place on the ring.
 * `copies` is the number of extra copies; the full ring has `copies + 1` places.
 */
export function repeatAroundRing(ids: string[], copies: number, radius: number, name: string, turn = true): string[] {
  const sources = selected(ids)
  const bounds = boundsOf(sources)
  if (!bounds || copies < 1 || radius <= 0) return []
  const centre = new Vector3(bounds.centre[0] - radius, bounds.min[1], bounds.centre[2])
  const places = copies + 1
  const label = name.trim() || `${sources[0].groupName ?? sources[0].name} (vòng)`
  return addCopies(
    sources,
    copies,
    (source, copy) => {
      const angle = (copy / places) * Math.PI * 2
      const spin = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), angle)
      const offset = new Vector3(...source.transform.position).sub(centre).applyQuaternion(spin).add(centre)
      const rotation = turn
        ? new Euler().setFromQuaternion(spin.clone().multiply(new Quaternion().setFromEuler(new Euler(...source.transform.rotation))))
        : new Euler(...source.transform.rotation)
      return { position: [roundMm(offset.x), roundMm(offset.y), roundMm(offset.z)], rotation: [rotation.x, rotation.y, rotation.z] }
    },
    'RepeatAroundRing',
    label,
  )
}
