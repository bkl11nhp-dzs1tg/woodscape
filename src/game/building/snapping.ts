import * as THREE from 'three'
import { useEditorStore } from '../../stores/editorStore'
import { useWorldStore } from '../../stores/worldStore'
import type { Vec3, WorldObject } from '../../types/world'
import { getDimensions, isOpening } from '../geometry/GeometryFactory'

/**
 * Smart snapping: when an object is dropped close to another, its faces are
 * pulled flush against (or level with) the neighbour's faces on each axis,
 * so edges and corners meet without typing numbers.
 */

export interface Aabb {
  min: Vec3
  max: Vec3
}

/** How close (meters) a face must be to a neighbour's face to snap. */
export const SNAP_DISTANCE = 0.15
/** Neighbours further than this in the other two axes are ignored. */
const NEIGHBOUR_MARGIN = 0.4

const matrix = new THREE.Matrix4()
const euler = new THREE.Euler()

/** World-space bounding box of an object's (rotated) bounding volume. */
export function worldAabb(geometry: WorldObject['geometry'], position: Vec3, rotation: Vec3): Aabb {
  const size = getDimensions(geometry)
  const half = [size.width / 2, size.height / 2, size.depth / 2]
  const e = matrix.makeRotationFromEuler(euler.set(...rotation)).elements
  const extent = [0, 1, 2].map(
    (row) => Math.abs(e[row]) * half[0] + Math.abs(e[4 + row]) * half[1] + Math.abs(e[8 + row]) * half[2],
  )
  return {
    min: [position[0] - extent[0], position[1] - extent[1], position[2] - extent[2]],
    max: [position[0] + extent[0], position[1] + extent[1], position[2] + extent[2]],
  }
}

/** Per-axis correction that brings `moving` flush or level with the nearest neighbour face. */
export function snapOffset(moving: Aabb, others: readonly Aabb[], distance = SNAP_DISTANCE): Vec3 {
  const result: Vec3 = [0, 0, 0]
  for (let axis = 0; axis < 3; axis++) {
    const a = (axis + 1) % 3
    const b = (axis + 2) % 3
    let best = distance
    for (const other of others) {
      const near =
        moving.min[a] < other.max[a] + NEIGHBOUR_MARGIN &&
        moving.max[a] > other.min[a] - NEIGHBOUR_MARGIN &&
        moving.min[b] < other.max[b] + NEIGHBOUR_MARGIN &&
        moving.max[b] > other.min[b] - NEIGHBOUR_MARGIN
      if (!near) continue
      const candidates = [
        other.max[axis] - moving.min[axis], // touch: my low face on their high face
        other.min[axis] - moving.max[axis], // touch: my high face on their low face
        other.min[axis] - moving.min[axis], // level: low faces aligned
        other.max[axis] - moving.max[axis], // level: high faces aligned
      ]
      for (const delta of candidates) {
        if (Math.abs(delta) < Math.abs(best)) best = delta
      }
    }
    if (Math.abs(best) < distance) result[axis] = best
  }
  return result
}

/** Position for an object after smart snapping against everything else in the world. */
export function snapToNeighbours(
  geometry: WorldObject['geometry'],
  position: Vec3,
  rotation: Vec3,
  ignoreId?: string,
): Vec3 {
  if (!useEditorStore.getState().snapEnabled || isOpening(geometry.shape)) return position
  const others: Aabb[] = []
  for (const obj of Object.values(useWorldStore.getState().objects)) {
    if (obj.id === ignoreId || obj.type === 'mark_line' || isOpening(obj.geometry.shape)) continue
    others.push(worldAabb(obj.geometry, obj.transform.position, obj.transform.rotation))
  }
  const offset = snapOffset(worldAabb(geometry, position, rotation), others)
  return [position[0] + offset[0], position[1] + offset[1], position[2] + offset[2]]
}
