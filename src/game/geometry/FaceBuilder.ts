import * as THREE from 'three'
import type { Vec3 } from '../../types/world'

/**
 * Builds geometry out of axis-aligned rectangles, sorted into the six box
 * face groups (right, left, top, bottom, front, back) by their normal.
 * UVs are in meters measured from `origin`, so textures run continuously
 * across neighbouring pieces. Used for walls with openings and for frames.
 */
export class FaceBuilder {
  private readonly positions: number[][] = [[], [], [], [], [], []]
  private readonly uvs: number[][] = [[], [], [], [], [], []]

  /** `swapUV[group]` turns the texture a quarter turn on that face group. */
  constructor(
    private readonly origin: Vec3,
    private readonly swapUV: boolean[] = [],
  ) {}

  /** One rectangle: the side of the box [min, max] facing `sign` along `axis` (0 = X, 1 = Y, 2 = Z). */
  face(axis: 0 | 1 | 2, sign: 1 | -1, min: Vec3, max: Vec3): void {
    const [ua, va] = axis === 0 ? [2, 1] : axis === 1 ? [0, 2] : [0, 1]
    const fixed = sign > 0 ? max[axis] : min[axis]
    const corners: [number, number][] = [
      [min[ua], min[va]],
      [max[ua], min[va]],
      [max[ua], max[va]],
      [min[ua], max[va]],
    ]
    // The corner order winds around +Z for axis 2 and around the negative axis otherwise.
    const natural = axis === 2 ? 1 : -1
    const order = natural === sign ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]
    const group = axis * 2 + (sign > 0 ? 0 : 1)
    for (const index of order) {
      const [u, v] = corners[index]
      const point = [0, 0, 0]
      point[axis] = fixed
      point[ua] = u
      point[va] = v
      this.positions[group].push(point[0], point[1], point[2])
      const uu = u - this.origin[ua]
      const vv = v - this.origin[va]
      if (this.swapUV[group]) this.uvs[group].push(vv, uu)
      else this.uvs[group].push(uu, vv)
    }
  }

  /** All six sides of a box. */
  box(min: Vec3, max: Vec3): void {
    for (const axis of [0, 1, 2] as const) {
      this.face(axis, 1, min, max)
      this.face(axis, -1, min, max)
    }
  }

  /** Box given by center and size. */
  boxAt(center: Vec3, size: Vec3): void {
    this.box(
      [center[0] - size[0] / 2, center[1] - size[1] / 2, center[2] - size[2] / 2],
      [center[0] + size[0] / 2, center[1] + size[1] / 2, center[2] + size[2] / 2],
    )
  }

  build(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()
    const positions = this.positions.flat()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs.flat(), 2))
    let start = 0
    this.positions.forEach((list, group) => {
      const count = list.length / 3
      if (count > 0) geometry.addGroup(start, count, group)
      start += count
    })
    geometry.computeVertexNormals()
    return geometry
  }
}
