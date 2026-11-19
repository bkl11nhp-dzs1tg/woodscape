import { Euler, Quaternion, Vector3 } from 'three'
import type { ShapePreset } from '../../data/shapePresets'
import type { Vec3, WorldObject } from '../../types/world'
import { createObjectId, roundMm } from './commands'
import { boundsOf } from './repeatActions'

/**
 * A cluster is a set of objects stored relative to the middle of their bounding box.
 * It is how saved templates and generated stairs get placed as one thing.
 */
export type ClusterPart = Pick<WorldObject, 'type' | 'name' | 'materialId' | 'geometry' | 'transform'> &
  Partial<Pick<WorldObject, 'faceMaterials' | 'paint' | 'opacity' | 'open'>>

export interface ClusterTemplate {
  id: string
  name: string
  /** Width, height, depth of the whole cluster. */
  size: Vec3
  parts: ClusterPart[]
}

/** Turns objects into a template, positions relative to the middle of their bounds. Null when empty. */
export function captureCluster(objects: readonly WorldObject[], name: string): ClusterTemplate | null {
  const bounds = boundsOf(objects)
  if (!bounds) return null
  const parts = objects.map((obj): ClusterPart => {
    const [x, y, z] = obj.transform.position
    const part: ClusterPart = {
      type: obj.type,
      name: obj.name,
      materialId: obj.materialId,
      geometry: structuredClone(obj.geometry),
      transform: {
        position: [roundMm(x - bounds.centre[0]), roundMm(y - bounds.centre[1]), roundMm(z - bounds.centre[2])],
        rotation: [...obj.transform.rotation],
      },
    }
    if (obj.faceMaterials) part.faceMaterials = { ...obj.faceMaterials }
    if (obj.paint) part.paint = { ...obj.paint }
    if (obj.opacity !== undefined) part.opacity = obj.opacity
    if (obj.open !== undefined) part.open = obj.open
    return part
  })
  return {
    id: createObjectId('template'),
    name: name.trim() || 'Mẫu mới',
    size: [0, 1, 2].map((i) => roundMm(bounds.max[i] - bounds.min[i])) as Vec3,
    parts,
  }
}

/** New world objects for a template, centred at `centre` and turned by `yaw` about the vertical axis. */
export function instantiateCluster(parts: readonly ClusterPart[], name: string, centre: Vec3, yaw: number): WorldObject[] {
  const spin = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw)
  const groupId = createObjectId('group')
  return parts.map((part) => {
    const offset = new Vector3(...part.transform.position).applyQuaternion(spin)
    const rotation = new Euler().setFromQuaternion(spin.clone().multiply(new Quaternion().setFromEuler(new Euler(...part.transform.rotation))))
    return {
      ...structuredClone(part),
      id: createObjectId(part.type),
      locked: false,
      groupId,
      groupName: name,
      transform: {
        position: [roundMm(centre[0] + offset.x), roundMm(centre[1] + offset.y), roundMm(centre[2] + offset.z)],
        rotation: [rotation.x, rotation.y, rotation.z],
      },
    }
  })
}

export interface StairParams {
  steps: number
  /** Height of one step. */
  rise: number
  /** Depth of one step. */
  run: number
  width: number
  materialId: string
}

export const STAIR_DEFAULTS: StairParams = { steps: 8, rise: 0.18, run: 0.28, width: 1, materialId: 'oak_painted' }
export const MAX_STEPS = 60

/**
 * A wooden staircase rising toward +Z: a tread and a riser for every step, and a wedge-shaped board down each
 * side that carries them. Open underneath, so it reads as a staircase and not as a block of wood.
 */
export function buildStairs(params: StairParams): ClusterTemplate {
  const steps = Math.max(1, Math.min(MAX_STEPS, Math.round(params.steps)))
  const { rise, run, width } = params
  const height = steps * rise
  const depth = steps * run
  const parts: ClusterPart[] = []
  const tread = 0.05
  const board = 0.06
  for (let i = 0; i < steps; i++) {
    const top = (i + 1) * rise
    const front = -depth / 2 + run * i
    parts.push({
      type: 'stair_step',
      name: `Bậc ${i + 1}`,
      materialId: params.materialId,
      // The tread overhangs the riser a little, like a real nosing.
      geometry: { shape: 'box', width: roundMm(width - 2 * board), height: tread, depth: roundMm(run + 0.03) },
      transform: { position: [0, roundMm(-height / 2 + top - tread / 2), roundMm(front + run / 2 - 0.015)], rotation: [0, 0, 0] },
    })
    parts.push({
      type: 'stair_riser',
      name: `Cổ bậc ${i + 1}`,
      materialId: 'pine_painted',
      geometry: { shape: 'box', width: roundMm(width - 2 * board), height: roundMm(rise - tread), depth: 0.03 },
      transform: { position: [0, roundMm(-height / 2 + top - tread - (rise - tread) / 2), roundMm(front + 0.015)], rotation: [0, 0, 0] },
    })
  }
  for (const side of [-1, 1]) {
    parts.push({
      type: 'stair_side',
      name: 'Má cầu thang',
      materialId: 'walnut_painted',
      // A right-angled wedge turned so its tall end is toward +Z.
      geometry: { shape: 'prism', width: roundMm(depth), height: roundMm(height), depth: board, lean: 'right' },
      transform: { position: [roundMm(side * (width / 2 - board / 2)), 0, 0], rotation: [0, -Math.PI / 2, 0] },
    })
  }
  return { id: 'stairs', name: 'Cầu thang', size: [width, roundMm(height), roundMm(depth)], parts }
}

/** The shape-shelf entry that places a cluster (the ghost is a box of its overall size). */
export function clusterPreset(template: ClusterTemplate, group: ShapePreset['group']): ShapePreset {
  return {
    id: `preset_cluster_${template.id}`,
    type: 'cluster',
    name: template.name,
    group,
    geometry: { shape: 'box', width: template.size[0], height: template.size[1], depth: template.size[2] },
    materialId: 'plain_white',
    cluster: template.parts,
  }
}
