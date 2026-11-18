import { Euler, Quaternion, Vector3 } from 'three'
import { getTerrainHeight } from '../game/environment/terrain'
import type { GeometryParams, Paint, Vec3, WorldObject } from '../types/world'
import { MODELS } from './models'
import { slopeRotation, SLOPE_VECTORS, type Slope } from '../game/building/roof'
import { mainView, REFERENCES } from './references'
import { TREES, type TreeKind } from './trees'

/**
 * Starting content of a new world: a small riverside neighbourhood built only
 * from the parts the editor offers (boxes, panels, prisms, cylinders, cones,
 * spheres, doors, windows, openings, paint). It doubles as a stress test of
 * what the building system can express. Every part is an ordinary editable
 * object; walls open around doors and windows automatically.
 *
 * Coordinates inside a builder are local to the building: +Z is its front,
 * Y is height above its ground.
 */

const T = 0.2 // wall thickness
const SLAB = 0.2 // floor slab thickness
const ROOF = 0.1 // roof board thickness
const rad = (degrees: number) => (degrees * Math.PI) / 180
const round = (value: number) => Math.round(value * 1000) / 1000
const coat = (color: string, strength = 0.85): Paint => ({ color, strength })

interface Options {
  material?: string
  faces?: WorldObject['faceMaterials']
  paint?: Paint
  /** Rotation in degrees. */
  rot?: Vec3
  /** Rotation in radians (Euler XYZ); wins over `rot`. */
  rotRad?: Vec3
  opacity?: number
}

/** Collects the parts of one building, turning local coordinates into world ones. */
class Builder {
  readonly parts: WorldObject[] = []
  private readonly ground: number

  constructor(
    private readonly prefix: string,
    private readonly cx: number,
    private readonly cz: number,
    /** -1 turns the building half a turn, so its front faces -Z. */
    private readonly facing: 1 | -1 = 1,
    ground?: number,
  ) {
    this.ground = ground ?? getTerrainHeight(cx, cz)
  }

  add(name: string, type: string, geometry: GeometryParams, [x, y, z]: Vec3, options: Options = {}): void {
    const [rx, ry, rz] = options.rotRad ?? (options.rot ?? [0, 0, 0]).map(rad)
    const f = this.facing
    this.parts.push({
      id: `${this.prefix}_${String(this.parts.length + 1).padStart(3, '0')}`,
      type,
      name,
      materialId: options.material ?? 'pine_painted',
      faceMaterials: options.faces,
      geometry,
      transform: {
        position: [round(this.cx + f * x), round(this.ground + y), round(this.cz + f * z)],
        // Half a turn about Y: Ry(pi)·Rx(a) equals Rx(-a)·Ry(pi).
        rotation: f === 1 ? [rx, ry, rz] : [-rx, ry + Math.PI, rz],
      },
      locked: false,
      groupId: `group_${this.prefix}`,
      paint: options.paint,
      opacity: options.opacity,
    })
  }

  box(name: string, type: string, size: Vec3, position: Vec3, options: Options = {}): void {
    this.add(name, type, { shape: 'box', width: size[0], height: size[1], depth: size[2] }, position, options)
  }
}

/** Stands an imported 3D model (person, cat, dog) on the ground at a local spot, turned `turn` degrees. */
function placeModel(b: Builder, id: string, x: number, z: number, y = 0, turn = 0): void {
  const model = MODELS[id]
  b.add(model.name, 'reference', { shape: 'model', asset: id, height: model.height }, [x, y + model.height / 2, z], { material: 'plain_white', rot: [0, turn, 0] })
}

/** Stands a scale reference sprite (the seated person) on the ground at a local spot. */
function reference(b: Builder, asset: string, x: number, z: number, y = 0, turn = 0): void {
  const ref = REFERENCES[asset]
  const { width, height } = mainView(ref)
  b.add(ref.name, 'reference', { shape: 'card', asset, width, height }, [x, y + height / 2, z], { material: 'plain_white', rot: [0, turn, 0] })
}

interface Palette {
  wall: string
  roof: string
  trim: string
  frame: string
  door: string
}

const PALETTES = {
  cream: { wall: '#f6e3ae', roof: '#e9853a', trim: '#f2d9a0', frame: '#6f9fe0', door: '#a8432f' },
  blue: { wall: '#d6e4ee', roof: '#5f7391', trim: '#eef3f6', frame: '#ffffff', door: '#3f5f8a' },
  mint: { wall: '#d5e8d0', roof: '#3f8078', trim: '#eef6ea', frame: '#ffffff', door: '#c9803a' },
  pink: { wall: '#f3d6c6', roof: '#b85a41', trim: '#f7e7dc', frame: '#fff6ee', door: '#7a4a2b' },
  white: { wall: '#f4f0e6', roof: '#3f4f6f', trim: '#ffffff', frame: '#5f6f8f', door: '#c94f32' },
} satisfies Record<string, Palette>

/** Four walls of a rectangular room (plank siding under a coat of wall paint). */
function walls(b: Builder, label: string, x0: number, x1: number, z0: number, z1: number, y0: number, h: number, p: Palette, skipLeft = false): void {
  const y = y0 + h / 2
  const options = { paint: coat(p.wall, 0.82) }
  b.box(`Tường trước ${label}`, 'wall', [x1 - x0, h, T], [(x0 + x1) / 2, y, z1 - T / 2], options)
  b.box(`Tường sau ${label}`, 'wall', [x1 - x0, h, T], [(x0 + x1) / 2, y, z0 + T / 2], options)
  if (!skipLeft) b.box(`Tường trái ${label}`, 'wall', [T, h, z1 - z0 - 2 * T], [x0 + T / 2, y, (z0 + z1) / 2], options)
  b.box(`Tường phải ${label}`, 'wall', [T, h, z1 - z0 - 2 * T], [x1 - T / 2, y, (z0 + z1) / 2], options)
}

/** Clay tiles as they are, or tinted toward the palette's roof color for other houses. */
function roofFinish(p: Palette): Options {
  return { material: 'roof_terracotta_painted', paint: p.roof === PALETTES.cream.roof ? undefined : coat(p.roof, 0.62) }
}

/** One tiled roof board hanging down from the point `top` on the ridge line. */
function roofPlane(b: Builder, name: string, top: Vec3, dir: Slope, width: number, length: number, pitch: number, p: Palette): void {
  const a = rad(pitch)
  const [hx, hz] = SLOPE_VECTORS[dir]
  const along = length / 2
  const out = Math.cos(a) * along + (Math.sin(a) * ROOF) / 2
  b.box(name, 'roof', [width, ROOF, length], [top[0] + hx * out, top[1] - Math.sin(a) * along + (Math.cos(a) * ROOF) / 2, top[2] + hz * out], {
    ...roofFinish(p),
    rotRad: slopeRotation(dir, pitch),
  })
}

/** Gable roof with its ridge along X: two tiled boards, the two gable triangles and a ridge cap. */
function gableX(b: Builder, label: string, x0: number, x1: number, z0: number, z1: number, y: number, pitch: number, over: number, p: Palette): void {
  const a = rad(pitch)
  const half = (z1 - z0) / 2
  const rise = half * Math.tan(a)
  const length = half / Math.cos(a) + over
  const xm = (x0 + x1) / 2
  const zm = (z0 + z1) / 2
  const width = x1 - x0 + 2 * over
  roofPlane(b, `Mái trước ${label}`, [xm, y + rise, zm], 'z+', width, length, pitch, p)
  roofPlane(b, `Mái sau ${label}`, [xm, y + rise, zm], 'z-', width, length, pitch, p)
  b.box(`Nóc mái ${label}`, 'roof', [width, 0.14, 0.34], [xm, y + rise + 0.1, zm], { paint: coat(p.roof, 0.95) })
  for (const [side, x] of [['trái', x0 + T / 2], ['phải', x1 - T / 2]] as const) {
    b.add(`Đầu hồi ${side} ${label}`, 'wall', { shape: 'prism', width: z1 - z0, height: rise, depth: T }, [x, y + rise / 2, zm], {
      rot: [0, 90, 0],
      paint: coat(p.wall, 0.82),
    })
  }
}

/** Gable roof with its ridge along Z (the gable faces the front). */
function gableZ(b: Builder, label: string, x0: number, x1: number, z0: number, z1: number, y: number, pitch: number, over: number, p: Palette): void {
  const a = rad(pitch)
  const half = (x1 - x0) / 2
  const rise = half * Math.tan(a)
  const length = half / Math.cos(a) + over
  const xm = (x0 + x1) / 2
  const zm = (z0 + z1) / 2
  const width = z1 - z0 + 2 * over
  roofPlane(b, `Mái phải ${label}`, [xm, y + rise, zm], 'x+', width, length, pitch, p)
  roofPlane(b, `Mái trái ${label}`, [xm, y + rise, zm], 'x-', width, length, pitch, p)
  b.box(`Nóc mái ${label}`, 'roof', [0.34, 0.14, width], [xm, y + rise + 0.1, zm], { paint: coat(p.roof, 0.95) })
  for (const [side, z] of [['trước', z1 - T / 2], ['sau', z0 + T / 2]] as const) {
    b.add(`Đầu hồi ${side} ${label}`, 'wall', { shape: 'prism', width: x1 - x0, height: rise, depth: T }, [xm, y + rise / 2, z], {
      paint: coat(p.wall, 0.82),
    })
  }
}

/** Single-slope tiled roof falling toward the front, from the wall at `zTop` out past `zWall`. */
function leanTo(b: Builder, label: string, x0: number, x1: number, zTop: number, zWall: number, y: number, pitch: number, over: number, p: Palette): void {
  const a = rad(pitch)
  const run = zWall - zTop
  roofPlane(b, `Mái hiên ${label}`, [(x0 + x1) / 2, y + 0.06 + run * Math.tan(a), zTop], 'z+', x1 - x0 + 2 * over, (run + over) / Math.cos(a), pitch, p)
  // Close the triangular gaps at both ends. The hidden half of each prism sits inside the upper wall.
  const height = run * Math.tan(a)
  for (const x of [x0 + T / 2, x1 - T / 2]) {
    b.add(`Chắn hồi mái hiên ${label}`, 'wall', { shape: 'prism', width: run * 2, height, depth: T - 0.04 }, [x, y + height / 2, zTop], {
      rot: [0, 90, 0],
      paint: coat(p.wall, 0.82),
    })
  }
}

function windowAt(b: Builder, name: string, width: number, height: number, position: Vec3, p: Palette, sideways = false, shutters = false): void {
  b.add(name, 'window', { shape: 'window', width, height, thickness: 0.14 }, position, {
    material: 'birch_painted',
    paint: coat(p.frame, 0.9),
    rot: sideways ? [0, 90, 0] : undefined,
  })
  if (!sideways) {
    b.box(`Bệ ${name}`, 'trim', [width + 0.24, 0.07, 0.18], [position[0], position[1] - height / 2 - 0.035, position[2] + T / 2 + 0.05], {
      paint: coat(p.trim, 0.9),
    })
  }
  if (shutters && !sideways) {
    for (const side of [-1, 1]) {
      b.box(`Cánh chớp ${name}`, 'shutter', [0.32, height, 0.05], [position[0] + side * (width / 2 + 0.18), position[1], position[2] + T / 2 + 0.03], {
        paint: coat(p.roof, 0.85),
      })
    }
  }
}

function frontDoor(b: Builder, x: number, z: number, p: Palette): void {
  b.add('Cửa chính', 'door', { shape: 'door', width: 0.9, height: 2.05, thickness: 0.14, hinge: 'left' }, [x, 1.025, z], {
    material: 'oak_painted',
    paint: coat(p.door, 0.8),
  })
  b.box('Mái che cửa', 'roof', [1.5, 0.06, 0.8], [x, 2.42, z + 0.42], { rot: [16, 0, 0], paint: coat(p.roof, 0.8) })
  b.box('Bậc thềm', 'step', [1.3, 0.12, 0.5], [x, 0.06, z + 0.36], { material: 'concrete_painted' })
}

/** A painted garden tree, as a single editable object. */
function gardenTree(b: Builder, x: number, z: number, s: number, kind: TreeKind = 'broadleaf'): void {
  const def = TREES[kind]
  const height = def.height * s
  b.add(def.name, 'tree', { shape: 'tree', kind, height, seed: Math.floor(Math.abs(Math.sin(x * 12.9898 + z * 78.233)) * 1e9) }, [x, height / 2, z], { material: 'plain_white' })
}

/** Low garden wall around a lot, with a gap and two posts for the gate. */
function gardenWall(b: Builder, x0: number, x1: number, z0: number, z1: number, gateX: number, toStreet: number): void {
  const h = 0.9
  const w = 0.16
  const options = { material: 'concrete_painted', paint: coat('#d3d6d8', 0.45) }
  const gap = 0.9
  b.box('Tường rào trước', 'fence', [gateX - gap - x0, h, w], [(x0 + gateX - gap) / 2, h / 2, z1], options)
  b.box('Tường rào trước', 'fence', [x1 - gateX - gap, h, w], [(gateX + gap + x1) / 2, h / 2, z1], options)
  b.box('Tường rào sau', 'fence', [x1 - x0, h, w], [(x0 + x1) / 2, h / 2, z0], options)
  b.box('Tường rào trái', 'fence', [w, h, z1 - z0], [x0, h / 2, (z0 + z1) / 2], options)
  b.box('Tường rào phải', 'fence', [w, h, z1 - z0], [x1, h / 2, (z0 + z1) / 2], options)
  // Path from the front door, through the gate, out to the street.
  b.box('Lối vào nhà', 'road', [1.5, 0.04, toStreet + 2.2], [gateX, 0.02, z1 + (toStreet - 2.2) / 2], {
    material: 'concrete_painted',
    paint: coat('#d9c9a3', 0.85),
  })
  for (const side of [-1, 1]) {
    b.box('Trụ cổng', 'fence', [0.28, 1.15, 0.28], [gateX + side * gap, 0.575, z1], options)
  }
}

interface HouseSpec {
  /** Footprint width (X) and depth (Z) of the ground floor. */
  w: number
  d: number
  /** Depth of the upper floor, measured from the back wall. 0 = single storey. */
  upperDepth: number
  h1: number
  h2: number
  pitch: number
  palette: Palette
  doorX: number
  /** Interior staircase and stairwell (needs an upper floor at least 4 m deep). */
  stairs?: boolean
  /** Single-storey side wing on the right. */
  wing?: boolean
}

function house(b: Builder, spec: HouseSpec): void {
  const { w, d, upperDepth, h1, h2, pitch, palette: p } = spec
  const hw = w / 2
  const hd = d / 2
  const lip = 0.12
  const floorPaint = coat(p.trim, 0.55)

  b.box('Sàn tầng 1', 'floor', [w - 2 * T, 0.06, d - 2 * T], [0, 0.03, 0], { material: 'oak_painted' })
  walls(b, 'tầng 1', -hw, hw, -hd, hd, 0, h1, p)
  // Stone footing all round, and boards covering the four corners.
  for (const side of [-1, 1]) {
    b.box('Chân tường', 'trim', [w + 0.12, 0.32, 0.06], [0, 0.16, side * (hd + 0.03)], { material: 'stone_masonry_painted' })
    b.box('Chân tường', 'trim', [0.06, 0.32, d + 0.12], [side * (hw + 0.03), 0.16, 0], { material: 'stone_masonry_painted' })
    for (const end of [-1, 1]) {
      b.box('Nẹp góc', 'trim', [0.16, h1 - 0.32, 0.16], [side * (hw - 0.05), 0.32 + (h1 - 0.32) / 2, end * (hd - 0.05)], { paint: coat(p.trim, 0.9) })
    }
  }

  // Upper floor / ceiling slab, slightly wider than the walls so it reads as a trim band outside.
  const slab = (name: string, x0: number, x1: number, z0: number, z1: number) =>
    b.box(name, 'floor', [x1 - x0, SLAB, z1 - z0], [(x0 + x1) / 2, h1 + SLAB / 2, (z0 + z1) / 2], { paint: floorPaint })
  if (spec.stairs) {
    const sx = -hw + T + 1 // inner edge of the stairwell
    const sz = -hd + T + 2.6 // front edge of the stairwell
    slab('Sàn tầng 2', sx, hw + lip, -hd - lip, hd + lip)
    slab('Sàn tầng 2 (chiếu nghỉ)', -hw - lip, sx, sz, hd + lip)
    slab('Sàn tầng 2 (mép sau)', -hw - lip, sx, -hd - lip, -hd + T)
    slab('Sàn tầng 2 (mép trái)', -hw - lip, -hw + T, -hd + T, sz)
    const treads = 13
    const rise = h1 / treads
    for (let k = 1; k <= treads; k++) {
      b.box(`Bậc thang ${k}`, 'stair', [0.95, 0.05, 0.25], [-hw + T + 0.5, k * rise - 0.025, -hd + T + 0.1 + (k - 0.5) * 0.19], {
        material: 'oak_painted',
      })
    }
  } else {
    slab(upperDepth > 0 ? 'Sàn tầng 2' : 'Trần nhà', -hw - lip, hw + lip, -hd - lip, hd + lip)
  }

  const y2 = h1 + SLAB
  const front = hd - T / 2
  if (upperDepth > 0) {
    const zf = -hd + upperDepth
    walls(b, 'tầng 2', -hw, hw, -hd, zf, y2, h2, p)
    for (const side of [-1, 1]) {
      for (const z of [-hd + 0.05, zf - 0.05]) {
        b.box('Nẹp góc', 'trim', [0.16, h2, 0.16], [side * (hw - 0.05), y2 + h2 / 2, z], { paint: coat(p.trim, 0.9) })
      }
    }
    gableX(b, 'tầng 2', -hw, hw, -hd, zf, y2 + h2, pitch, 0.45, p)
    if (zf < hd - 0.5) leanTo(b, 'tầng 1', -hw, hw, zf, hd, y2, 22, 0.5, p)
    windowAt(b, 'Cửa sổ trước tầng 2', Math.min(1.6, w * 0.3), 1, [-w * 0.14, y2 + 1.3, zf - T / 2], p, false, true)
    windowAt(b, 'Cửa sổ sau tầng 2', 1.2, 1, [w * 0.15, y2 + 1.3, -hd + T / 2], p)
    windowAt(b, 'Cửa sổ bên tầng 2', 0.8, 1, [hw - T / 2, y2 + 1.3, (-hd + zf) / 2], p, true)
  } else {
    gableX(b, 'tầng 1', -hw, hw, -hd, hd, y2, pitch, 0.45, p)
  }

  frontDoor(b, spec.doorX, front, p)
  windowAt(b, 'Cửa sổ trước tầng 1', Math.min(1.6, w * 0.28), 1.1, [spec.doorX > 0 ? -w * 0.22 : w * 0.22, 1.5, front], p, false, true)
  windowAt(b, 'Cửa sổ sau tầng 1', 1.2, 1, [-w * 0.1, 1.5, -hd + T / 2], p)
  windowAt(b, 'Cửa sổ bên trái tầng 1', 1, 1, [-hw + T / 2, 1.5, hd * 0.35], p, true)

  if (spec.wing) {
    const x1 = hw + 2.8
    const z0 = hd - 3.6
    const z1 = hd - 0.5
    const hWing = 2.45
    b.box('Sàn chái', 'floor', [x1 - hw - T, 0.06, z1 - z0 - 2 * T], [(hw + x1 - T) / 2, 0.03, (z0 + z1) / 2], { material: 'oak_painted' })
    walls(b, 'chái', hw, x1, z0, z1, 0, hWing, p, true)
    b.box('Trần chái', 'floor', [x1 - hw + lip, SLAB, z1 - z0 + 2 * lip], [(hw + x1 + lip) / 2, hWing + SLAB / 2, (z0 + z1) / 2], { paint: floorPaint })
    gableZ(b, 'chái', hw, x1, z0, z1, hWing + SLAB, 30, 0.4, p)
    // Brick chimney at the back of the main roof.
    b.box('Ống khói', 'chimney', [0.6, 1.9, 0.6], [hw - 1.3, y2 + h2 + 0.75, -hd + 0.9], { material: 'brick_red_painted' })
    b.box('Mũ ống khói', 'chimney', [0.76, 0.1, 0.76], [hw - 1.3, y2 + h2 + 1.75, -hd + 0.9], { material: 'concrete_painted' })
    windowAt(b, 'Cửa sổ chái', 1, 1, [(hw + x1) / 2, 1.45, z1 - T / 2], p, false, true)
    // Doorway from the main room into the wing: a plain opening cut through the shared wall.
    b.add('Lối sang chái', 'opening', { shape: 'opening', width: 0.95, height: 2.05, thickness: 0.3 }, [hw - T / 2, 1.025, (z0 + z1) / 2], {
      material: 'plain_white',
      rot: [0, 90, 0],
    })
  } else {
    windowAt(b, 'Cửa sổ bên phải tầng 1', 1, 1, [hw - T / 2, 1.5, -hd * 0.2], p, true)
  }
}

/**
 * A road or path along a line of points: short flat pieces laid end to end,
 * each tilted to the slope under it, with a square pad at every bend.
 */
function road(b: Builder, name: string, points: [number, number][], width: number, color: string): void {
  const options = { material: 'concrete_painted', paint: coat(color, 0.9) }
  const thickness = 0.05
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, z0] = points[i]
    const [x1, z1] = points[i + 1]
    const pieces = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 2.5))
    for (let k = 0; k < pieces; k++) {
      const ax = x0 + ((x1 - x0) * k) / pieces
      const az = z0 + ((z1 - z0) * k) / pieces
      const bx = x0 + ((x1 - x0) * (k + 1)) / pieces
      const bz = z0 + ((z1 - z0) * (k + 1)) / pieces
      const ha = getTerrainHeight(ax, az)
      const hb = getTerrainHeight(bx, bz)
      const run = Math.hypot(bx - ax, bz - az)
      // Turn to the heading first, then tip up or down the slope.
      const turn = new Quaternion().setFromEuler(new Euler(0, Math.atan2(bx - ax, bz - az), 0))
      const tip = new Quaternion().setFromEuler(new Euler(-Math.atan2(hb - ha, run), 0, 0))
      const euler = new Euler().setFromQuaternion(turn.multiply(tip), 'XYZ')
      b.box(name, 'road', [width, thickness, Math.hypot(run, hb - ha) + 0.02], [(ax + bx) / 2, (ha + hb) / 2 + 0.03, (az + bz) / 2], {
        ...options,
        rotRad: [euler.x, euler.y, euler.z],
      })
    }
    if (i > 0) b.box(name, 'road', [width, thickness, width], [x0, getTerrainHeight(x0, z0) + 0.032, z0], options)
  }
}

function neighbourhood(): WorldObject[] {
  const builders: Builder[] = []
  const at = (prefix: string, x: number, z: number, facing: 1 | -1 = 1, ground?: number) => {
    const builder = new Builder(prefix, x, z, facing, ground)
    builders.push(builder)
    return builder
  }

  // Roads follow the ground and join everything up, with no dead ends in town:
  // the street, a ring road behind the south houses, the lane to the bridge,
  // and trails on to the landmark sites across the river.
  const roads = at('roads', 0, 0, 1, 0)
  const grey = '#74787d'
  const sand = '#d9c9a3'
  road(roads, 'Đường phố', [[-18, 56], [44, 56]], 4.4, grey)
  road(roads, 'Đường vòng', [[44, 56], [44, 77], [-18, 77], [-18, 56]], 3.2, grey)
  road(roads, 'Đường ra cầu', [[-18, 56], [-18, 20], [-10, 14.6]], 3.2, grey)
  for (const [x, z] of [[-18, 56], [44, 56]]) {
    roads.box('Ngã rẽ', 'road', [4.4, 0.05, 4.4], [x, getTerrainHeight(x, z) + 0.034, z], { material: 'concrete_painted', paint: coat(grey, 0.9) })
  }
  road(roads, 'Đường mòn tới tháp', [[-10, -23.6], [16, -31], [46, -36], [67, -38]], 1.8, sand)
  road(roads, 'Đường mòn tới đền', [[-10, -23.6], [-26, -42], [-50, -56]], 1.8, sand)
  road(roads, 'Đường tới tháp đồng hồ', [[44, 56], [58, 50]], 3.2, grey)
  road(roads, 'Lối vào công viên', [[24, 58.2], [26.3, 63.4]], 1.6, sand)
  for (let i = 0; i < 15; i++) {
    const x = -14 + i * 4
    roads.box('Vạch kẻ đường', 'road', [1.6, 0.012, 0.12], [x, getTerrainHeight(x, 56) + 0.062, 56], { material: 'chalk_white' })
  }

  // The main house: cream siding, orange roofs, blue window frames.
  const home = at('home', 5, 46.2)
  house(home, { w: 6.4, d: 6, upperDepth: 3.8, h1: 2.7, h2: 2.4, pitch: 28, palette: PALETTES.cream, doorX: 1.4, stairs: true, wing: true })
  gardenWall(home, -5.2, 8.2, -5, 5, 1.4, 2.6)
  gardenTree(home, -4.2, 6.3, 1)
  gardenTree(home, 7.3, 6.3, 0.85)
  home.box('Trụ hòm thư', 'prop', [0.08, 1, 0.08], [2.9, 0.5, 4.6], { material: 'walnut_painted' })
  reference(home, 'ref_person_standing', 0.2, 6.3, 0, 160)
  // The cat is on the garden path, which is 4 cm proud of the lawn; the side-view drawing is turned to face the street.
  placeModel(home, 'model_cat', 1.9, 6.2, 0.045, 200)
  home.box('Hòm thư', 'prop', [0.32, 0.24, 0.2], [2.9, 1.1, 4.6], { paint: coat('#c8392b', 0.95) })

  const b = at('house_b', 21.5, 46)
  house(b, { w: 5.6, d: 5.4, upperDepth: 5.4, h1: 2.6, h2: 2.4, pitch: 32, palette: PALETTES.blue, doorX: -1.2 })
  gardenWall(b, -4.6, 4.6, -4.6, 5.2, -1.2, 2.6)
  gardenTree(b, 3.3, 6.3, 0.95)

  const c = at('house_c', -9, 46.5)
  house(c, { w: 6.2, d: 5, upperDepth: 0, h1: 2.6, h2: 0, pitch: 30, palette: PALETTES.mint, doorX: 1.3 })
  gardenWall(c, -4.9, 4.9, -4.4, 4.7, 1.3, 2.6)
  gardenTree(c, -3.6, 6.2, 0.95)

  const d = at('house_d', -3, 66.5, -1)
  house(d, { w: 5.8, d: 5.6, upperDepth: 3.6, h1: 2.6, h2: 2.3, pitch: 30, palette: PALETTES.pink, doorX: 1.2 })
  gardenWall(d, -4.7, 4.7, -4.6, 5.2, 1.2, 3.1)
  gardenTree(d, -3.4, 6.3, 0.95)

  const e = at('house_e', 14, 66.2, -1)
  house(e, { w: 5, d: 4.6, upperDepth: 0, h1: 2.5, h2: 0, pitch: 34, palette: PALETTES.white, doorX: -1 })
  gardenWall(e, -4.2, 4.2, -4.1, 4.9, -1, 3.1)
  gardenTree(e, 3, 6.2, 0.9)

  // Round pavilion in a small park.
  const pavilion = at('pavilion', 28.5, 66)
  pavilion.add('Sàn chòi', 'floor', { shape: 'cylinder', radius: 2.7, height: 0.14 }, [0, 0.07, 0])
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2
    pavilion.add('Cột chòi', 'post', { shape: 'cylinder', radius: 0.1, height: 2.5 }, [Math.cos(angle) * 2.3, 1.39, Math.sin(angle) * 2.3], {
      material: 'oak_painted',
    })
  }
  pavilion.add('Mái chòi', 'roof', { shape: 'cone', radius: 3.1, height: 1.5 }, [0, 3.39, 0], { paint: coat('#e9853a', 0.85) })
  pavilion.box('Ghế băng', 'prop', [1.6, 0.08, 0.45], [0, 0.5, -1.3], { material: 'oak_painted' })
  reference(pavilion, 'ref_person_sitting', 0, -0.98, 0.14, 0)
  placeModel(pavilion, 'model_dog', 1.5, 0.6, 0.14, -50)
  for (const side of [-1, 1]) pavilion.box('Chân ghế', 'prop', [0.08, 0.36, 0.4], [side * 0.65, 0.32, -1.3], { material: 'oak_painted' })

  // Timber footbridge across the river.
  const bridge = at('bridge', -10, -4, 1, getTerrainHeight(-10, 16))
  const span = 36
  bridge.box('Mặt cầu', 'deck', [2.4, 0.14, span], [0, 0.67, 0], { material: 'pine_painted' })
  for (const side of [-1, 1]) {
    bridge.box('Dầm cầu', 'beam', [0.2, 0.26, span], [side * 0.9, 0.47, 0], { material: 'walnut_painted' })
    bridge.box('Lan can trên', 'rail', [0.08, 0.1, span], [side * 1.28, 1.72, 0], { material: 'oak_painted' })
    bridge.box('Lan can giữa', 'rail', [0.06, 0.08, span], [side * 1.28, 1.25, 0], { material: 'oak_painted' })
    for (let i = -4; i <= 4; i++) {
      bridge.add('Trụ cầu', 'post', { shape: 'cylinder', radius: 0.13, height: 6 }, [side * 1.28, -1.25, i * 4.4], { material: 'walnut_painted' })
    }
  }
  for (const end of [-1, 1]) {
    bridge.box('Bậc lên cầu', 'step', [2.4, 0.37, 0.6], [0, 0.185, end * (span / 2 + 0.3)], { material: 'oak_painted' })
    bridge.box('Bậc lên cầu', 'step', [2.4, 0.19, 0.6], [0, 0.095, end * (span / 2 + 0.9)], { material: 'oak_painted' })
  }

  // Lookout tower by the coast.
  const tower = at('tower', 70, -38)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) tower.box('Chân tháp', 'post', [0.22, 6.2, 0.22], [sx * 1.2, 3.1, sz * 1.2], { material: 'walnut_painted' })
  }
  tower.box('Sàn tháp', 'deck', [3.2, 0.14, 3.2], [0, 4.4, 0], { material: 'pine_painted' })
  for (const [dx, dz, size] of [[0, 1.5, [3.2, 0.1, 0.08]], [0, -1.5, [3.2, 0.1, 0.08]], [1.5, 0, [0.08, 0.1, 3.2]], [-1.5, 0, [0.08, 0.1, 3.2]]] as [number, number, Vec3][]) {
    tower.box('Lan can tháp', 'rail', size, [dx, 5.4, dz], { material: 'oak_painted' })
  }
  tower.add('Mái tháp', 'roof', { shape: 'cone', radius: 2.5, height: 1.4 }, [0, 6.9, 0], { paint: coat('#e9853a', 0.85) })

  // ---- Famous structures of the world, at their real size ----
  // Sizes are the published dimensions; the detail is what the parts allow.

  // Great Pyramid of Giza: 230.3 m square, 146.6 m tall. Nothing on land is big
  // enough to hold it, so it stands on a sand island off the coast.
  const pyramid = at('pyramid', 330, 20, 1, 0)
  const sandstone = { material: 'stone_masonry_painted', paint: coat('#e2cf9c', 0.72) }
  pyramid.box('Đảo cát', 'landmark', [262, 3, 262], [0, -0.3, 0], { material: 'concrete_painted', paint: coat('#e6d7a8', 0.9) })
  const courses = 36
  for (let i = 0; i < courses; i++) {
    const size = 230.3 * (1 - i / courses)
    const h = 146.6 / courses
    pyramid.box(`Tầng đá ${i + 1}`, 'landmark', [size, h, size], [0, 1.2 + h / 2 + i * h, 0], sandstone)
  }

  // Parthenon: platform 69.5 x 30.9 m, 8 x 17 columns 10.4 m tall and 1.9 m across.
  const temple = at('temple', -50, -78)
  const marble = { material: 'plain_white' }
  const marblePalette: Palette = { wall: '#f1ecdf', roof: '#e9e2d2', trim: '#f1ecdf', frame: '#f1ecdf', door: '#f1ecdf' }
  const tl = 69.5
  const tw = 30.9
  for (let i = 0; i < 3; i++) {
    const grow = (2 - i) * 1.4
    temple.box('Bậc nền đền', 'landmark', [tl + grow, 0.55, tw + grow], [0, 0.275 + i * 0.55, 0], marble)
  }
  const floorTop = 1.65
  const columnHeight = 10.4
  const column = (x: number, z: number) => {
    temple.add('Cột đền', 'landmark', { shape: 'cylinder', radius: 0.95, height: columnHeight - 0.5 }, [x, floorTop + (columnHeight - 0.5) / 2, z], marble)
    temple.box('Đầu cột', 'landmark', [2.3, 0.5, 2.3], [x, floorTop + columnHeight - 0.25, z], marble)
  }
  const cx = tl / 2 - 1.3
  const cz = tw / 2 - 1.3
  for (let i = 0; i < 17; i++) {
    const x = -cx + (i * 2 * cx) / 16
    column(x, cz)
    column(x, -cz)
  }
  for (let i = 1; i < 7; i++) {
    const z = -cz + (i * 2 * cz) / 7
    column(cx, z)
    column(-cx, z)
  }
  // Inner hall (cella) with its doorway side left as plain wall.
  temple.box('Gian thờ', 'landmark', [48, columnHeight, 19], [0, floorTop + columnHeight / 2, 0], marble)
  // Entablature: beam course, then the frieze band set slightly back.
  const beamY = floorTop + columnHeight
  for (const [name, y, inset] of [['Dầm đầu cột', beamY + 0.68, 0], ['Dải phù điêu', beamY + 2.03, 0.15]] as [string, number, number][]) {
    for (const side of [-1, 1]) {
      temple.box(name, 'landmark', [tl - inset * 2, 1.35, 2.2], [0, y, side * (cz - inset)], marble)
      temple.box(name, 'landmark', [2.2, 1.35, tw - 4.8], [side * (cx - inset), y, 0], marble)
    }
  }
  temple.box('Trần đền', 'landmark', [tl - 3, 0.3, tw - 3], [0, beamY + 2.6, 0], marble)
  gableX(temple, 'đền', -tl / 2, tl / 2, -tw / 2, tw / 2, beamY + 2.7, 15.5, 0.6, marblePalette)

  // Eiffel Tower: 330 m tall on a 124.9 m square base, platforms at 57.6, 115.7 and 276 m.
  // It stands on its own sand island out in the bay, far enough to see whole from town.
  const iron = at('irontower', 235, -255, 1, 0)
  iron.box('Đảo cát tháp Eiffel', 'landmark', [150, 9, 150], [0, -4.2, 0], { material: 'concrete_painted', paint: coat('#e6d7a8', 0.9) })
  const ironwork = { material: 'metal_dark', paint: coat('#7d6652', 0.7) }
  // [half-width of the tower, height, thickness of each leg] going up the curve.
  const profile: [number, number, number][] = [
    [62.45, 0, 13], [46, 30, 11], [35, 57.6, 9], [26.5, 86, 7.5], [20.5, 115.7, 6],
    [14, 170, 4.6], [10.5, 225, 3.6], [9.3, 276, 3], [2.8, 312, 2], [1.4, 324, 1.4],
  ]
  const up = new Vector3(0, 1, 0)
  for (let s = 0; s < profile.length - 1; s++) {
    const [h0, y0, t0] = profile[s]
    const [h1, y1, t1] = profile[s + 1]
    const thick = (t0 + t1) / 2
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const from = new Vector3(sx * (h0 - t0 / 2), y0, sz * (h0 - t0 / 2))
        const to = new Vector3(sx * (h1 - t1 / 2), y1, sz * (h1 - t1 / 2))
        const lean = new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(up, to.clone().sub(from).normalize()), 'XYZ')
        const mid = from.clone().add(to).multiplyScalar(0.5)
        iron.box('Chân tháp Eiffel', 'landmark', [thick, from.distanceTo(to) + 0.5, thick], [mid.x, mid.y, mid.z], { ...ironwork, rotRad: [lean.x, lean.y, lean.z] })
      }
    }
    // Ring of girders tying the four legs together at this height.
    if (s > 0) {
      const beam = Math.max(0.8, t0 * 0.3)
      for (const side of [-1, 1]) {
        iron.box('Giằng tháp Eiffel', 'landmark', [h0 * 2, beam, beam], [0, y0, side * (h0 - beam / 2)], ironwork)
        iron.box('Giằng tháp Eiffel', 'landmark', [beam, beam, h0 * 2], [side * (h0 - beam / 2), y0, 0], ironwork)
      }
    }
  }
  for (const [label, half, y] of [['tầng 1', 37.5, 57.6], ['tầng 2', 22.5, 115.7], ['tầng 3', 10.8, 276]] as [string, number, number][]) {
    iron.box(`Sàn tháp Eiffel ${label}`, 'landmark', [half * 2, 2.2, half * 2], [0, y + 1.1, 0], ironwork)
    for (const side of [-1, 1]) {
      iron.box('Lan can tháp Eiffel', 'landmark', [half * 2, 1.4, 0.3], [0, y + 2.9, side * half], ironwork)
      iron.box('Lan can tháp Eiffel', 'landmark', [0.3, 1.4, half * 2], [side * half, y + 2.9, 0], ironwork)
    }
  }
  iron.box('Buồng đỉnh tháp Eiffel', 'landmark', [5, 6, 5], [0, 321, 0], ironwork)
  iron.box('Cột ăng-ten', 'landmark', [0.7, 6, 0.7], [0, 327, 0], ironwork)

  // Great torii of Itsukushima: 16.6 m tall, top beam 24.2 m, two main posts each braced by four legs.
  const gate = at('torii', 56, -37.3)
  const vermilion = { material: 'plain_white', paint: coat('#d8402b', 0.95) }
  for (const side of [-1, 1]) {
    const z = side * 5.45
    gate.add('Trụ chính', 'landmark', { shape: 'cylinder', radius: 0.7, height: 13.4 }, [0, 6.7, z], vermilion)
    for (const fore of [-1, 1]) {
      gate.add('Trụ phụ', 'landmark', { shape: 'cylinder', radius: 0.36, height: 8.6 }, [fore * 2.6, 4.3, z], vermilion)
      gate.box('Xà giằng trụ', 'landmark', [2.6, 0.4, 0.4], [fore * 1.3, 6.4, z], vermilion)
      gate.box('Xà giằng trụ', 'landmark', [2.6, 0.4, 0.4], [fore * 1.3, 3.2, z], vermilion)
    }
    gate.box('Mái trụ phụ', 'landmark', [6.4, 0.3, 1.5], [0, 8.75, z], { material: 'metal_dark' })
  }
  gate.box('Xà ngang dưới', 'landmark', [0.9, 0.8, 15.4], [0, 10.6, 0], vermilion)
  gate.box('Hộp biển tên', 'landmark', [0.5, 1.5, 1.3], [0, 12.2, 0], vermilion)
  gate.box('Xà ngang trên', 'landmark', [1.3, 1, 21.4], [0, 13.9, 0], vermilion)
  gate.box('Xà nóc', 'landmark', [1.9, 0.8, 23.2], [0, 14.8, 0], vermilion)
  gate.box('Mái cổng', 'landmark', [2.5, 0.5, 24.2], [0, 15.45, 0], { material: 'metal_dark' })
  for (const side of [-1, 1]) {
    gate.box('Đầu mái cổng', 'landmark', [2.5, 0.5, 2.4], [0, 16.0, side * 11.3], { material: 'metal_dark', rot: [side * -14, 0, 0] })
  }

  // Elizabeth Tower ("Big Ben"): 96.3 m tall on a 12 m square base, dials 7 m across at 55 m.
  const clock = at('clocktower', 58, 38)
  const limestone = { material: 'concrete_painted', paint: coat('#d9c48e', 0.8) }
  const dark = { material: 'metal_dark' }
  clock.box('Chân tháp', 'landmark', [13.4, 3, 13.4], [0, 1.5, 0], limestone)
  clock.box('Thân tháp', 'landmark', [12, 52, 12], [0, 29, 0], limestone)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) clock.box('Trụ góc', 'landmark', [1.8, 62, 1.8], [sx * 5.7, 34, sz * 5.7], limestone)
  }
  for (let level = 1; level <= 4; level++) {
    clock.box('Gờ chỉ', 'landmark', [12.7, 0.7, 12.7], [0, 3 + level * 10.4, 0], limestone)
    // Tall narrow windows on each face of every storey.
    for (const side of [-1, 1]) {
      for (const offset of [-2.2, 2.2]) {
        clock.box('Cửa sổ tháp', 'landmark', [1.1, 6, 0.2], [offset, level * 10.4 - 2, side * 6.02], dark)
        clock.box('Cửa sổ tháp', 'landmark', [0.2, 6, 1.1], [side * 6.02, level * 10.4 - 2, offset], dark)
      }
    }
  }
  clock.box('Buồng đồng hồ', 'landmark', [13.2, 11, 13.2], [0, 60.5, 0], limestone)
  for (const side of [-1, 1]) {
    clock.add('Viền mặt đồng hồ', 'landmark', { shape: 'cylinder', radius: 3.9, height: 0.3 }, [0, 60.5, side * 6.7], { ...dark, rot: [90, 0, 0] })
    clock.add('Mặt đồng hồ', 'landmark', { shape: 'cylinder', radius: 3.5, height: 0.3 }, [0, 60.5, side * 6.82], { material: 'plain_white', rot: [90, 0, 0] })
    clock.box('Kim giờ', 'landmark', [0.35, 2, 0.12], [0.6, 61.2, side * 7.02], { ...dark, rot: [0, 0, -35] })
    clock.box('Kim phút', 'landmark', [0.25, 3.1, 0.12], [0, 62, side * 7.02], dark)
    clock.add('Viền mặt đồng hồ', 'landmark', { shape: 'cylinder', radius: 3.9, height: 0.3 }, [side * 6.7, 60.5, 0], { ...dark, rot: [0, 0, 90] })
    clock.add('Mặt đồng hồ', 'landmark', { shape: 'cylinder', radius: 3.5, height: 0.3 }, [side * 6.82, 60.5, 0], { material: 'plain_white', rot: [0, 0, 90] })
    clock.box('Kim giờ', 'landmark', [0.12, 2, 0.35], [side * 7.02, 61.2, -0.6], { ...dark, rot: [35, 0, 0] })
    clock.box('Kim phút', 'landmark', [0.12, 3.1, 0.25], [side * 7.02, 62, 0], dark)
  }
  clock.box('Gờ buồng đồng hồ', 'landmark', [14, 0.8, 14], [0, 66.4, 0], limestone)
  clock.box('Lầu chuông', 'landmark', [11, 8, 11], [0, 70.8, 0], limestone)
  for (const side of [-1, 1]) {
    for (const offset of [-3, 0, 3]) {
      clock.box('Ô lầu chuông', 'landmark', [1.6, 5, 0.2], [offset, 70.6, side * 5.52], dark)
      clock.box('Ô lầu chuông', 'landmark', [0.2, 5, 1.6], [side * 5.52, 70.6, offset], dark)
    }
  }
  // Spire: three stepped roofs in dark slate, then the point.
  const slate = { material: 'plain_white', paint: coat('#4a5568', 0.95) }
  for (const [size, y, h] of [[12, 76.3, 3], [9.4, 80.3, 5], [6.4, 85.3, 5]] as [number, number, number][]) {
    clock.box('Mái tháp', 'landmark', [size, h, size], [0, y, 0], slate)
  }
  clock.add('Chóp tháp', 'landmark', { shape: 'cone', radius: 3.4, height: 7.5 }, [0, 91.55, 0], slate)
  clock.box('Kim thu lôi', 'landmark', [0.25, 2.2, 0.25], [0, 95.2, 0], dark)

  return builders.flatMap((builder) => builder.parts)
}

export function createShowcaseObjects(): WorldObject[] {
  return neighbourhood()
}
