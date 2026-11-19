import * as THREE from 'three'
import type { GeometryParams, ShapeKind } from '../../types/world'
import { FIGURES } from '../../data/figures'
import { MODELS } from '../../data/models'
import { TREES } from '../../data/trees'
import { FaceBuilder } from './FaceBuilder'

/**
 * Builds real parametric 3D geometry from canonical object data.
 *
 * UVs are written in METERS (not 0..1) so that every texture keeps the same
 * physical scale regardless of object size. Textures set `repeat = 1 / tileSize`.
 */

const cache = new Map<string, THREE.BufferGeometry>()

export function isBoxLike(shape: ShapeKind): boolean {
  return shape === 'box' || shape === 'panel'
}

/** Doors and windows: multi-part objects that swing open and cut openings in walls. */
export function isOpening(shape: ShapeKind): shape is 'door' | 'window' | 'opening' {
  return shape === 'door' || shape === 'window' || shape === 'opening'
}

/** Rectangular through-holes in a box, in its local space. */
export interface WallHoles {
  /** The wall's thin axis; holes go through it. */
  thin: 'x' | 'z'
  /** `u` runs along the wall's length (X when thin is Z, Z when thin is X), `v` along its height. */
  rects: { u0: number; u1: number; v0: number; v1: number }[]
}

/** Axis-aligned size of the shape in its local space (meters). */
export function getDimensions(g: GeometryParams): { width: number; height: number; depth: number } {
  switch (g.shape) {
    case 'box':
    case 'prism':
      return { width: g.width, height: g.height, depth: g.depth }
    case 'panel':
    case 'door':
    case 'window':
    case 'opening':
      return { width: g.width, height: g.height, depth: g.thickness }
    case 'extrude': {
      const xs = g.points.map((p) => p[0])
      const ys = g.points.map((p) => p[1])
      return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys), depth: g.depth }
    }
    case 'card':
      return { width: g.width, height: g.height, depth: 0.02 }
    case 'figure': {
      const def = FIGURES[g.kind]
      const k = g.height / def.height
      return { width: def.width * k, height: g.height, depth: def.depth * k }
    }
    case 'model': {
      const def = MODELS[g.asset]
      if (!def) return { width: 1, height: g.height, depth: 1 }
      const k = g.height / def.height
      return { width: def.width * k, height: g.height, depth: def.depth * k }
    }
    case 'tree': {
      const def = TREES[g.kind]
      const k = g.height / def.height
      return { width: def.width * k, height: g.height, depth: def.depth * k }
    }
    case 'sphere':
      return { width: g.radius * 2, height: g.radius * 2, depth: g.radius * 2 }
    case 'cylinder':
    case 'cone':
      return { width: g.radius * 2, height: g.height, depth: g.radius * 2 }
  }
}

/**
 * `alignGrain`: on box faces, run the texture U axis along the longer edge
 * (wood grain along a beam). Leave false for brick, stone and other materials
 * that must stay upright.
 */
export function getGeometry(g: GeometryParams, alignGrain = false): THREE.BufferGeometry {
  const key = JSON.stringify(g) + (alignGrain ? '|grain' : '')
  let geometry = cache.get(key)
  if (!geometry) {
    geometry = createGeometry(g, alignGrain)
    cache.set(key, geometry)
  }
  return geometry
}

export function createGeometry(g: GeometryParams, alignGrain = false): THREE.BufferGeometry {
  switch (g.shape) {
    case 'box':
      return createBox(g.width, g.height, g.depth, alignGrain)
    case 'panel':
      return createBox(g.width, g.height, g.thickness, alignGrain)
    case 'door':
    case 'window':
    case 'opening':
      // Bounding volume only (placement preview, outline); the parts are built by OpeningMesh.
      return createBox(g.width, g.height, g.thickness, false)
    case 'prism':
      return createPrism(g.width, g.height, g.depth, g.lean)
    case 'extrude':
      return createExtrude(g.points, g.holes ?? [], g.depth)
    case 'card':
      // Bounding volume only; the picture is drawn by CardPicture.
      return createBox(g.width, g.height, 0.02, false)
    case 'figure':
    case 'model':
    case 'tree': {
      const size = getDimensions(g)
      return createBox(size.width, size.height, size.depth, false)
    }
    case 'sphere':
      return createSphere(g.radius)
    case 'cylinder':
      return createCylinder(g.radius, g.radius, g.height)
    case 'cone':
      return createCylinder(0, g.radius, g.height)
  }
}

/**
 * Box with six real faces. Material groups 0..5 map to
 * right, left, top, bottom, front, back (see BOX_FACES).
 * With `alignGrain` the texture U axis follows the longer edge of each face,
 * so wood grain runs along the length of a beam or plank.
 */
function createBox(width: number, height: number, depth: number, alignGrain: boolean): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth)
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
  // [size along default U, size along default V] for each face group.
  const faceSizes: [number, number][] = [
    [depth, height],
    [depth, height],
    [width, depth],
    [width, depth],
    [width, height],
    [width, height],
  ]
  for (let face = 0; face < 6; face++) {
    const [a, b] = faceSizes[face]
    for (let i = face * 4; i < face * 4 + 4; i++) {
      const u = uv.getX(i)
      const v = uv.getY(i)
      if (alignGrain && b > a) uv.setXY(i, v * b, u * a)
      else uv.setXY(i, u * a, v * b)
    }
  }
  uv.needsUpdate = true
  return geometry
}

/**
 * Box with rectangular openings cut through its thin axis. Only exposed
 * surfaces are generated, including the reveals inside each opening, and every
 * rectangle lands in the face group its normal points to (so the sill of an
 * opening uses the box's `top` material, for example).
 */
export function createBoxWithHoles(
  width: number,
  height: number,
  depth: number,
  alignGrain: boolean,
  holes: WallHoles,
): THREE.BufferGeometry {
  const half = [width / 2, height / 2, depth / 2]
  const uAxis = holes.thin === 'z' ? 0 : 2
  const tAxis = holes.thin === 'z' ? 2 : 0
  const cuts = (lo: number, hi: number, edges: number[]) =>
    [...new Set([lo, hi, ...edges.filter((e) => e > lo && e < hi)])].sort((a, b) => a - b)
  const us = cuts(-half[uAxis], half[uAxis], holes.rects.flatMap((r) => [r.u0, r.u1]))
  const vs = cuts(-half[1], half[1], holes.rects.flatMap((r) => [r.v0, r.v1]))
  const solid = (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= us.length - 1 || j >= vs.length - 1) return false
    const u = (us[i] + us[i + 1]) / 2
    const v = (vs[j] + vs[j + 1]) / 2
    return !holes.rects.some((r) => u > r.u0 && u < r.u1 && v > r.v0 && v < r.v1)
  }

  const builder = new FaceBuilder([-half[0], -half[1], -half[2]], boxUvSwaps(width, height, depth, alignGrain))
  for (let i = 0; i < us.length - 1; i++) {
    for (let j = 0; j < vs.length - 1; j++) {
      if (!solid(i, j)) continue
      const min: [number, number, number] = [0, vs[j], 0]
      const max: [number, number, number] = [0, vs[j + 1], 0]
      min[uAxis] = us[i]
      max[uAxis] = us[i + 1]
      min[tAxis] = -half[tAxis]
      max[tAxis] = half[tAxis]
      builder.face(tAxis as 0 | 2, 1, min, max)
      builder.face(tAxis as 0 | 2, -1, min, max)
      if (!solid(i + 1, j)) builder.face(uAxis as 0 | 2, 1, min, max)
      if (!solid(i - 1, j)) builder.face(uAxis as 0 | 2, -1, min, max)
      if (!solid(i, j + 1)) builder.face(1, 1, min, max)
      if (!solid(i, j - 1)) builder.face(1, -1, min, max)
    }
  }
  return builder.build()
}

/** Per face group: whether the texture is turned so U follows the longer edge. */
function boxUvSwaps(width: number, height: number, depth: number, alignGrain: boolean): boolean[] {
  const faceSizes: [number, number][] = [
    [depth, height],
    [depth, height],
    [width, depth],
    [width, depth],
    [width, height],
    [width, height],
  ]
  return faceSizes.map(([a, b]) => alignGrain && b > a)
}

/** Outline with holes pushed through a thickness, centered on Z. UVs come out in meters. */
function createExtrude(points: [number, number][], holes: [number, number][][], depth: number): THREE.BufferGeometry {
  const toVectors = (list: [number, number][]) => list.map(([x, y]) => new THREE.Vector2(x, y))
  const shape = new THREE.Shape(toVectors(points))
  for (const hole of holes) shape.holes.push(new THREE.Path(toVectors(hole)))
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 })
  geometry.translate(0, 0, -depth / 2)
  // One material covers every face of a cut piece.
  geometry.clearGroups()
  return geometry
}

/**
 * Triangular prism with flat-shaded faces and UVs in meters. Isosceles unless `lean` is given:
 * then the apex sits over that end, which makes a right-angled wedge (stairs stringers, roof ends).
 */
function createPrism(width: number, height: number, depth: number, lean?: 'left' | 'right'): THREE.BufferGeometry {
  const w = width / 2
  const h = height / 2
  const d = depth / 2
  const apex = lean === 'left' ? -w : lean === 'right' ? w : 0
  const slopeRight = Math.hypot(w - apex, height)
  const slopeLeft = Math.hypot(apex + w, height)
  const positions: number[] = []
  const uvs: number[] = []
  const tri = (points: [number, number, number, number, number][]) => {
    for (const [x, y, z, u, v] of points) {
      positions.push(x, y, z)
      uvs.push(u, v)
    }
  }
  const quad = (a: [number, number, number], b: [number, number, number], c: [number, number, number], e: [number, number, number], uLength: number, vLength: number) => {
    tri([[...a, 0, 0], [...b, uLength, 0], [...c, uLength, vLength]])
    tri([[...a, 0, 0], [...c, uLength, vLength], [...e, 0, vLength]])
  }
  // Front (+Z) and back (-Z) triangles.
  tri([[-w, -h, d, 0, 0], [w, -h, d, width, 0], [apex, h, d, apex + w, height]])
  tri([[w, -h, -d, 0, 0], [-w, -h, -d, width, 0], [apex, h, -d, w - apex, height]])
  // Bottom and the two sides (one side of a wedge is vertical).
  quad([-w, -h, -d], [w, -h, -d], [w, -h, d], [-w, -h, d], width, depth)
  quad([w, -h, d], [w, -h, -d], [apex, h, -d], [apex, h, d], depth, slopeRight)
  quad([-w, -h, -d], [-w, -h, d], [apex, h, d], [apex, h, -d], depth, slopeLeft)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.computeVertexNormals()
  return geometry
}

function createSphere(radius: number): THREE.BufferGeometry {
  // Small spheres (leaf clumps in a hedge) need far fewer facets than a big ball.
  const small = radius < 0.6
  const geometry = new THREE.SphereGeometry(radius, small ? 14 : 40, small ? 9 : 24)
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * 2 * Math.PI * radius, uv.getY(i) * Math.PI * radius)
  }
  return geometry
}

function createCylinder(radiusTop: number, radiusBottom: number, height: number): THREE.BufferGeometry {
  const radialSegments = 40
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, 1)
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
  const radius = Math.max(radiusTop, radiusBottom)
  const sideVertexCount = (radialSegments + 1) * 2
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i)
    const v = uv.getY(i)
    if (i < sideVertexCount) {
      // Side: grain runs along the height of a log/post.
      uv.setXY(i, v * height, u * 2 * Math.PI * radius)
    } else {
      uv.setXY(i, (u - 0.5) * 2 * radius, (v - 0.5) * 2 * radius)
    }
  }
  return geometry
}

type Pt2 = [number, number]

function insidePolygon([x, y]: Pt2, polygon: Pt2[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/**
 * A cut wall (an extrusion) with its doors and windows: each opening becomes one more hole in the
 * outline. An opening that does not lie wholly inside the outline, or that runs into another hole,
 * is left out rather than breaking the shape.
 */
export function createExtrudeWithOpenings(points: Pt2[], holes: Pt2[][], depth: number, rects: WallHoles['rects']): THREE.BufferGeometry {
  const bounds = (poly: Pt2[]) => ({
    x0: Math.min(...poly.map((p) => p[0])),
    x1: Math.max(...poly.map((p) => p[0])),
    y0: Math.min(...poly.map((p) => p[1])),
    y1: Math.max(...poly.map((p) => p[1])),
  })
  const taken = holes.map(bounds)
  const extra: Pt2[][] = []
  for (const r of rects) {
    const poly: Pt2[] = [[r.u0, r.v0], [r.u1, r.v0], [r.u1, r.v1], [r.u0, r.v1]]
    if (!poly.every((p) => insidePolygon(p, points))) continue
    const box = { x0: r.u0, x1: r.u1, y0: r.v0, y1: r.v1 }
    if (taken.some((t) => box.x0 < t.x1 && box.x1 > t.x0 && box.y0 < t.y1 && box.y1 > t.y0)) continue
    taken.push(box)
    extra.push(poly)
  }
  return createExtrude(points, [...holes, ...extra], depth)
}
