import * as THREE from 'three'
import type { WorldObject } from '../../types/world'
import { getDimensions, isOpening, type WallHoles } from '../geometry/GeometryFactory'

/**
 * Keeps the first-person camera out of solid objects. Every object is treated
 * as its oriented bounding box. Openings cut by doors and windows can be passed
 * through, and an open door or window does not block.
 */

const rotation = new THREE.Quaternion()
const inverse = new THREE.Quaternion()
const euler = new THREE.Euler()
const local = new THREE.Vector3()
const closest = new THREE.Vector3()

export function resolveCameraCollision(
  position: THREE.Vector3,
  radius: number,
  objects: readonly WorldObject[],
  holes: Record<string, WallHoles>,
): void {
  // Two passes so that being pushed out of one object into another settles.
  for (let pass = 0; pass < 2; pass++) {
    for (const obj of objects) {
      // Decorative frames (an arch round a doorway) are drawn flat on the wall and must never block it.
      if (obj.type === 'detail' && obj.geometry.shape === 'extrude') continue
      // The side boards of a staircase are low at the bottom: a person steps in from the side.
      if (obj.type === 'stair_side') continue
      if (obj.geometry.shape === 'opening' || obj.geometry.shape === 'card' || obj.geometry.shape === 'figure' || obj.type === 'mark_line') continue
      if (isOpening(obj.geometry.shape) && obj.open) continue
      const size = getDimensions(obj.geometry)
      if (obj.geometry.shape === 'tree') {
        size.width = Math.min(size.width, 0.5)
        size.depth = Math.min(size.depth, 0.5)
      }
      const hx = size.width / 2
      const hy = size.height / 2
      const hz = size.depth / 2
      const [px, py, pz] = obj.transform.position
      // Cheap reject before the rotation math.
      const reach = Math.hypot(hx, hy, hz) + radius
      if (Math.abs(position.x - px) > reach || Math.abs(position.y - py) > reach || Math.abs(position.z - pz) > reach) continue

      rotation.setFromEuler(euler.set(...obj.transform.rotation))
      inverse.copy(rotation).invert()
      local.set(position.x - px, position.y - py, position.z - pz).applyQuaternion(inverse)

      const wallHoles = holes[obj.id]
      if (wallHoles) {
        const u = wallHoles.thin === 'z' ? local.x : local.z
        if (wallHoles.rects.some((r) => u > r.u0 && u < r.u1 && local.y > r.v0 && local.y < r.v1)) continue
      }

      closest.set(
        THREE.MathUtils.clamp(local.x, -hx, hx),
        THREE.MathUtils.clamp(local.y, -hy, hy),
        THREE.MathUtils.clamp(local.z, -hz, hz),
      )
      const distance = local.distanceTo(closest)
      if (distance >= radius) continue

      if (distance > 1e-6) {
        local.sub(closest).multiplyScalar(radius / distance).add(closest)
      } else {
        // Inside the box: leave through the nearest side.
        const gaps = [hx - Math.abs(local.x), hy - Math.abs(local.y), hz - Math.abs(local.z)]
        const axis = gaps.indexOf(Math.min(...gaps))
        const halves = [hx, hy, hz]
        const sign = local.getComponent(axis) >= 0 ? 1 : -1
        local.setComponent(axis, sign * (halves[axis] + radius))
      }
      local.applyQuaternion(rotation)
      position.set(px + local.x, py + local.y, pz + local.z)
    }
  }
}
