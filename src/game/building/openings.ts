import * as THREE from 'three'
import type { WorldObject } from '../../types/world'
import { getDimensions, isBoxLike, isOpening, type WallHoles } from '../geometry/GeometryFactory'

/**
 * Doors and windows cut their own openings: any box that a door or window
 * frame sits in (roughly parallel to its thin axis) gets a through-hole the
 * size of the frame. Holes are derived from object data on every change, so
 * moving or deleting the door moves or closes the hole. Nothing is baked.
 */

/** Walls thicker than this are treated as solid blocks, not walls. */
const MAX_WALL_THICKNESS = 0.6
const MIN_OVERLAP = 0.02

const wallRotation = new THREE.Quaternion()
const openingRotation = new THREE.Quaternion()
const euler = new THREE.Euler()
const point = new THREE.Vector3()
const axisA = new THREE.Vector3()
const axisB = new THREE.Vector3()

function quaternionOf(obj: WorldObject, target: THREE.Quaternion): THREE.Quaternion {
  return target.setFromEuler(euler.set(...obj.transform.rotation))
}

const round = (value: number) => Math.round(value * 1000) / 1000

export function computeWallHoles(objects: readonly WorldObject[]): Record<string, WallHoles> {
  const openings = objects.filter((obj) => isOpening(obj.geometry.shape))
  const result: Record<string, WallHoles> = {}
  if (openings.length === 0) return result

  for (const wall of objects) {
    if (!isBoxLike(wall.geometry.shape)) continue
    const size = getDimensions(wall.geometry)
    const thin: 'x' | 'z' = size.depth <= size.width ? 'z' : 'x'
    const thinHalf = (thin === 'z' ? size.depth : size.width) / 2
    if (thinHalf * 2 > MAX_WALL_THICKNESS) continue
    const uHalf = (thin === 'z' ? size.width : size.depth) / 2
    const vHalf = size.height / 2
    quaternionOf(wall, wallRotation)
    const inverse = wallRotation.clone().invert()
    axisA.set(thin === 'x' ? 1 : 0, 0, thin === 'z' ? 1 : 0).applyQuaternion(wallRotation)

    for (const opening of openings) {
      quaternionOf(opening, openingRotation)
      axisB.set(0, 0, 1).applyQuaternion(openingRotation)
      if (Math.abs(axisA.dot(axisB)) < 0.95) continue

      // Bounding box of the opening's frame in the wall's local space.
      const frame = getDimensions(opening.geometry)
      const min = [Infinity, Infinity, Infinity]
      const max = [-Infinity, -Infinity, -Infinity]
      for (let corner = 0; corner < 8; corner++) {
        point
          .set(
            (corner & 1 ? 0.5 : -0.5) * frame.width,
            (corner & 2 ? 0.5 : -0.5) * frame.height,
            (corner & 4 ? 0.5 : -0.5) * frame.depth,
          )
          .applyQuaternion(openingRotation)
          .add(axisB.set(...opening.transform.position))
          .sub(axisB.set(...wall.transform.position))
          .applyQuaternion(inverse)
        const local = [point.x, point.y, point.z]
        for (let k = 0; k < 3; k++) {
          min[k] = Math.min(min[k], local[k])
          max[k] = Math.max(max[k], local[k])
        }
      }

      const t = thin === 'z' ? 2 : 0
      const u = thin === 'z' ? 0 : 2
      if (max[t] < -thinHalf || min[t] > thinHalf) continue
      const rect = {
        u0: round(Math.max(min[u], -uHalf)),
        u1: round(Math.min(max[u], uHalf)),
        v0: round(Math.max(min[1], -vHalf)),
        v1: round(Math.min(max[1], vHalf)),
      }
      if (rect.u1 - rect.u0 < MIN_OVERLAP || rect.v1 - rect.v0 < MIN_OVERLAP) continue
      result[wall.id] ??= { thin, rects: [] }
      result[wall.id].rects.push(rect)
    }
  }
  return result
}

let cachedFor: Record<string, WorldObject> | null = null
let cached: Record<string, WallHoles> = {}

/** Memoized on the store's `objects` record, which is replaced on every edit. */
export function getWallHoles(objects: Record<string, WorldObject>): Record<string, WallHoles> {
  if (objects !== cachedFor) {
    cachedFor = objects
    cached = computeWallHoles(Object.values(objects))
  }
  return cached
}
