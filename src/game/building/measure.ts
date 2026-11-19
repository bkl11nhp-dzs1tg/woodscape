import { Vector3 } from 'three'
import type { Vec3 } from '../../types/world'

/** Distances and angle for the picked points (pure maths, used by the labels and the tests). */
export function measure(points: readonly Vec3[]) {
  const v = points.map((p) => new Vector3(...p))
  const result: { length?: number; horizontal?: number; rise?: number; angle?: number } = {}
  if (v.length >= 2) {
    const d = v[1].clone().sub(v[0])
    result.length = d.length()
    result.horizontal = Math.hypot(d.x, d.z)
    result.rise = d.y
  }
  if (v.length >= 3) {
    const a = v[0].clone().sub(v[1])
    const b = v[2].clone().sub(v[1])
    result.angle = a.length() > 1e-6 && b.length() > 1e-6 ? (a.angleTo(b) * 180) / Math.PI : 0
  }
  return result
}

