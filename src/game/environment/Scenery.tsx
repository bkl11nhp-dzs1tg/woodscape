import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useEditorStore } from '../../stores/editorStore'
import { QUALITY } from '../core/quality'
import { createRng } from '../core/random'
import { getToonGradient } from '../materials/MaterialFactory'
import { biomeAt, flatness, getTerrainHeight, type Biome } from './terrain'

/**
 * Vegetation and rocks, generated deterministically and drawn with instancing.
 *
 * Trees are built the way a painter would: a bent, tapering trunk with a root
 * flare, branches that fork, and foliage made of many painted leaf-cluster
 * cards (broadleaf) or needle sprigs layered in drooping tiers (pine). No
 * foliage is a plain ball. Cards are alpha-cut pictures drawn in code and
 * tinted per card, dark inside the crown and sunlit on top.
 */

interface Instance {
  position: [number, number, number]
  scale: [number, number, number]
  /** Direction the part's local +Y axis points to (trunks and branches). */
  direction?: [number, number, number]
  /** Rotation of a card: tilt (X), turn about the vertical (Y), roll (Z), applied as Y · X · Z. */
  euler?: [number, number, number]
  /** Spin around the part's own axis (trunks, rocks). */
  spin: number
  color: THREE.Color
}

type Rng = () => number

const TAU = Math.PI * 2
const BROADLEAF_GREENS = ['#6fc24d', '#82cf5c', '#5fb347', '#8fd664']
const PINE_GREENS = ['#4f9a62', '#448a58', '#5aa56c']
const BUSH_GREENS = ['#73c055', '#62b04c', '#88cc66']
const PALM_GREENS = ['#79b955', '#88c761', '#6aa94a']
const ROCK_GREYS = ['#aaa69c', '#98958c', '#b8b2a4']
const BARK = new THREE.Color('#8a6744')
const PINE_BARK = new THREE.Color('#7a5a3c')
const PALM_BARK = new THREE.Color('#a58a62')
const HIGHLIGHT = new THREE.Color('#e4f59a')
const SHADE = new THREE.Color('#2c6a3c')

function pick<T>(list: readonly T[], rng: Rng): T {
  return list[Math.floor(rng() * list.length)]
}

/** Foliage color for a card at `height` (0 = bottom of the crown, 1 = top): dark inside and below, sunlit above. */
function leafColor(base: THREE.Color, height: number, rng: Rng): THREE.Color {
  const color = base.clone()
  if (height > 0.45) color.lerp(HIGHLIGHT, (height - 0.45) * 0.6)
  else color.lerp(SHADE, (0.45 - height) * 0.75)
  return color.offsetHSL((rng() - 0.5) * 0.025, 0, (rng() - 0.5) * 0.06)
}

export interface Parts {
  wood: Instance[]
  /** Painted leaf clusters (crossed pair of cards). */
  leaves: Instance[]
  /** Needle sprigs for pines. */
  needles: Instance[]
  /** Long palm fronds. */
  palms: Instance[]
  rocks: Instance[]
}

// ---------------------------------------------------------------- painted foliage textures

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const element = document.createElement('canvas')
  element.width = width
  element.height = height
  return [element, element.getContext('2d')!]
}

function textureOf(element: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(element)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/** A cluster of overlapping pointed leaves: back leaves dark, front and upper leaves bright. */
function leafClusterTexture(seed: number): THREE.CanvasTexture {
  const [element, ctx] = canvas(256, 256)
  const rng = createRng(seed)
  const count = 85
  for (let i = 0; i < count; i++) {
    const depth = i / count
    const angle = rng() * TAU
    const reach = Math.sqrt(rng()) * 104 * (0.5 + 0.5 * (1 - depth * 0.6))
    const x = 128 + Math.cos(angle) * reach
    const y = 128 + Math.sin(angle) * reach * 0.9 - depth * 10
    const length = 38 + rng() * 26
    const width = length * (0.4 + rng() * 0.14)
    const lightness = Math.min(255, 135 + depth * 85 + (1 - y / 256) * 40 + rng() * 22)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rng() * TAU)
    ctx.beginPath()
    ctx.moveTo(-length / 2, 0)
    ctx.quadraticCurveTo(0, -width, length / 2, 0)
    ctx.quadraticCurveTo(0, width, -length / 2, 0)
    ctx.fillStyle = `rgb(${lightness},${lightness},${Math.round(lightness * 0.93)})`
    ctx.fill()
    ctx.strokeStyle = 'rgba(30,50,20,0.35)'
    ctx.lineWidth = 1.2
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-length / 2 + 3, 0)
    ctx.lineTo(length / 2 - 4, 0)
    ctx.strokeStyle = 'rgba(30,60,20,0.22)'
    ctx.stroke()
    ctx.restore()
  }
  return textureOf(element)
}

/**
 * A sprig pointing up the card: a solid feathered shape with a serrated edge
 * (so the card reads as dense foliage from a distance), a stem down the middle,
 * and needle or leaflet strokes on top for texture.
 */
function sprigTexture(kind: 'needle' | 'palm', seed: number): THREE.CanvasTexture {
  const [element, ctx] = canvas(128, 256)
  const rng = createRng(seed)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const bend = (y: number) => (kind === 'palm' ? Math.sin((1 - y / 256) * 2) * 6 : 0)
  const halfWidth = (along: number) => {
    // Needle sprigs are widest a third of the way up; palm fronds are long and slim.
    if (kind === 'palm') return 50 * Math.pow(Math.sin(Math.PI * Math.min(1, along * 1.05)), 0.8)
    return 60 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + along * 0.9)), 0.65) * (1 - along * 0.25)
  }

  // Solid body with a serrated edge.
  const left: [number, number][] = []
  const right: [number, number][] = []
  const rows = kind === 'palm' ? 26 : 34
  for (let k = 0; k <= rows; k++) {
    const along = k / rows
    const y = 254 - along * 250
    const spike = k % 2 === 0 ? 1 : kind === 'palm' ? 0.45 : 0.7
    const reach = halfWidth(along) * spike * (0.92 + rng() * 0.16)
    left.push([64 + bend(y) - reach, y - (k % 2 === 0 ? 6 : 0)])
    right.push([64 + bend(y) + reach, y - (k % 2 === 0 ? 6 : 0)])
  }
  ctx.beginPath()
  ctx.moveTo(64, 256)
  left.forEach(([x, y]) => ctx.lineTo(x, y))
  ctx.lineTo(64 + bend(0), 0)
  right.reverse().forEach(([x, y]) => ctx.lineTo(x, y))
  ctx.closePath()
  ctx.fillStyle = 'rgb(165,165,155)'
  ctx.fill()

  // Lighter strokes fanning from the stem toward the tip, like needles or leaflets.
  const strokes = kind === 'palm' ? 20 : 34
  for (let k = 0; k < strokes; k++) {
    const along = (k + 0.5) / strokes
    const y = 250 - along * 240
    const reach = halfWidth(along) * 0.92
    for (const side of [-1, 1]) {
      const lightness = 175 + along * 70 + rng() * 10
      ctx.strokeStyle = `rgb(${lightness},${lightness},${Math.round(lightness * 0.92)})`
      ctx.lineWidth = kind === 'palm' ? 4.5 : 4
      ctx.beginPath()
      ctx.moveTo(64 + bend(y), y)
      ctx.lineTo(64 + bend(y) + side * reach, y - reach * 0.42)
      ctx.stroke()
    }
  }
  // The stem, darker.
  ctx.strokeStyle = 'rgb(105,105,95)'
  ctx.lineWidth = 3.5
  ctx.beginPath()
  ctx.moveTo(64, 256)
  for (let y = 256; y >= 4; y -= 8) ctx.lineTo(64 + bend(y), y)
  ctx.stroke()
  return textureOf(element)
}

/** Two crossed upright cards centered on the origin, normals up so the foliage is lit from above. */
function leafCardGeometry(): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  const planes: [number, number][] = [[1, 0], [0, 1]]
  planes.forEach(([dx, dz], q) => {
    for (const [s, y] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
      positions.push(s * dx, y, s * dz)
      uvs.push(s + 0.5, y + 0.5)
      normals.push(0, 1, 0)
    }
    const o = q * 4
    indices.push(o, o + 1, o + 2, o, o + 2, o + 3)
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setIndex(indices)
  return geometry
}

/** A flat card lying in the ground plane, hinged at z = 0 and running out to z = 1 (pine sprigs, palm fronds). */
function frondGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 1, -0.5, 0, 1], 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3))
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  return geometry
}

// ---------------------------------------------------------------- trees

/** Trunk part between two points. */
function limb(parts: Parts, from: THREE.Vector3, to: THREE.Vector3, radius: number, color: THREE.Color): void {
  const length = from.distanceTo(to)
  const mid = from.clone().add(to).multiplyScalar(0.5)
  parts.wood.push({
    position: [mid.x, mid.y, mid.z],
    scale: [radius, length * 1.04, radius],
    direction: [to.x - from.x, to.y - from.y, to.z - from.z],
    spin: 0,
    color,
  })
}

/** Leaf-cluster cards scattered around a point. */
function foliage(parts: Parts, centre: THREE.Vector3, count: number, spread: number, size: number, base: THREE.Color, baseY: number, crownH: number, rng: Rng): void {
  for (let k = 0; k < count; k++) {
    const p = new THREE.Vector3((rng() - 0.5) * 2, (rng() - 0.4) * 1.4, (rng() - 0.5) * 2).multiplyScalar(spread).add(centre)
    const height = THREE.MathUtils.clamp((p.y - baseY) / crownH, 0, 1)
    const s = size * (0.8 + rng() * 0.45)
    parts.leaves.push({
      position: [p.x, p.y, p.z],
      scale: [s, s * 0.85, s],
      euler: [(rng() - 0.5) * 1.1, rng() * TAU, (rng() - 0.5) * 0.9],
      spin: 0,
      color: leafColor(base, height, rng),
    })
  }
}

export function addBroadleaf(parts: Parts, x: number, y: number, z: number, s: number, rng: Rng, light = false): void {
  const base = new THREE.Color(pick(BROADLEAF_GREENS, rng))
  const trunkHeight = (2.5 + rng() * 0.9) * s
  const bend = rng() * TAU
  const lean = (0.1 + rng() * 0.3) * s
  // A trunk of three tapering segments that bends a little, with a flared foot.
  const spine = [0, 1, 2, 3].map((k) => {
    const t = k / 3
    return new THREE.Vector3(x + Math.cos(bend) * lean * t * t, y + trunkHeight * t, z + Math.sin(bend) * lean * t * t)
  })
  parts.wood.push({ position: [x, y + 0.25 * s, z], scale: [0.42 * s, 0.6 * s, 0.42 * s], spin: rng() * TAU, color: BARK })
  for (let k = 0; k < 3; k++) limb(parts, spine[k], spine[k + 1], (0.24 - k * 0.045) * s, BARK)
  const onTrunk = (t: number) => {
    const f = Math.min(2.999, t * 3)
    const k = Math.floor(f)
    return spine[k].clone().lerp(spine[k + 1], f - k)
  }

  const crownBase = y + trunkHeight * 0.55
  const crownHeight = trunkHeight * 0.95 + 1.6 * s
  const branches = light ? 5 : 7
  const turn = rng() * TAU
  for (let b = 0; b < branches; b++) {
    const azimuth = turn + (b / branches) * TAU + (rng() - 0.5) * 0.6
    const start = onTrunk(0.5 + 0.45 * (b / branches) + (rng() - 0.5) * 0.06)
    const lift = 0.4 + rng() * 0.55
    const length = (1.3 + rng() * 1.0) * s
    const direction = new THREE.Vector3(Math.cos(azimuth) * Math.cos(lift), Math.sin(lift), Math.sin(azimuth) * Math.cos(lift))
    const end = start.clone().addScaledVector(direction, length)
    limb(parts, start, end, 0.085 * s, BARK)
    foliage(parts, end, light ? 2 : 3, 0.55 * s, 1.6 * s, base, crownBase, crownHeight, rng)
    if (rng() < 0.75) {
      // The branch forks: a thinner twig leaves it two-thirds of the way out.
      const fork = start.clone().addScaledVector(direction, length * 0.6)
      const side = azimuth + (rng() < 0.5 ? 0.7 : -0.7)
      const twig = new THREE.Vector3(Math.cos(side) * Math.cos(lift + 0.25), Math.sin(lift + 0.25), Math.sin(side) * Math.cos(lift + 0.25))
      const tip = fork.clone().addScaledVector(twig, length * 0.6)
      limb(parts, fork, tip, 0.05 * s, BARK)
      foliage(parts, tip, light ? 1 : 2, 0.45 * s, 1.4 * s, base, crownBase, crownHeight, rng)
    }
  }
  // The crown on top, and dark leaves deep inside so the foliage has depth.
  foliage(parts, spine[3].clone().add(new THREE.Vector3(0, 0.7 * s, 0)), light ? 3 : 5, 0.6 * s, 1.9 * s, base, crownBase, crownHeight, rng)
  const inner = SHADE.clone().lerp(base, 0.35)
  for (let k = 0; k < (light ? 2 : 4); k++) {
    const p = spine[3].clone().add(new THREE.Vector3((rng() - 0.5) * 1.4 * s, (rng() - 0.2) * 0.8 * s, (rng() - 0.5) * 1.4 * s))
    parts.leaves.push({ position: [p.x, p.y, p.z], scale: [1.5 * s, 1.3 * s, 1.5 * s], euler: [(rng() - 0.5) * 0.8, rng() * TAU, 0], spin: 0, color: inner })
  }
}

export function addPine(parts: Parts, x: number, y: number, z: number, s: number, rng: Rng): void {
  const base = new THREE.Color(pick(PINE_GREENS, rng))
  const height = (5.4 + rng() * 1.4) * s
  limb(parts, new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + height * 0.8, z), 0.17 * s, PINE_BARK)
  const tiers = 11
  for (let t = 0; t < tiers; t++) {
    const f = t / (tiers - 1)
    const tierY = y + 0.8 * s + f * (height - 1.5 * s)
    const radius = (1.9 - 1.55 * f) * s
    const count = 14 - Math.round(f * 5)
    const droop = 0.55 - 0.2 * f
    for (let c = 0; c < count; c++) {
      const yaw = (c / count) * TAU + t * 0.7 + (rng() - 0.5) * 0.25
      parts.needles.push({
        position: [x, tierY, z],
        scale: [radius * 0.95, 1, radius],
        euler: [droop + (rng() - 0.5) * 0.12, yaw, 0],
        spin: 0,
        color: leafColor(base, f, rng),
      })
    }
  }
  // Upright tip.
  for (let c = 0; c < 4; c++) {
    parts.needles.push({
      position: [x, y + height - 0.55 * s, z],
      scale: [0.3 * s, 1, 0.75 * s],
      euler: [-1.2, (c / 4) * TAU, 0],
      spin: 0,
      color: leafColor(base, 1, rng),
    })
  }
}

/** Beach palm: a leaning, curving trunk and a crown of arching fronds. */
export function addPalm(parts: Parts, x: number, y: number, z: number, s: number, rng: Rng): void {
  const lean = rng() * TAU
  const reach = (0.7 + rng() * 1.0) * s
  const height = (4.3 + rng() * 1.4) * s
  const point = (t: number) => new THREE.Vector3(x + Math.cos(lean) * reach * t * t, y + height * t, z + Math.sin(lean) * reach * t * t)
  for (let k = 0; k < 5; k++) limb(parts, point(k / 5), point((k + 1) / 5), (0.17 - k * 0.018) * s, PALM_BARK)
  const top = point(1)
  const base = new THREE.Color(pick(PALM_GREENS, rng))
  const fronds = 9
  for (let k = 0; k < fronds; k++) {
    const yaw = (k / fronds) * TAU + rng() * 0.3
    const outer = k % 2 === 0
    parts.palms.push({
      position: [top.x, top.y, top.z],
      scale: [(outer ? 1.05 : 0.85) * s, 1, (outer ? 2.5 : 1.9) * s],
      euler: [outer ? 0.55 + rng() * 0.25 : -0.15 + rng() * 0.2, yaw, 0],
      spin: 0,
      color: leafColor(base, outer ? 0.4 : 0.8, rng),
    })
  }
}

/** How many of the candidate spots in each zone grow a tree. */
const TREE_DENSITY: Record<Biome, number> = { water: 0, beach: 0.1, riverbank: 0.05, plain: 0.08, forest: 0.85, highland: 0.07 }

function generate(treeLimit = 640): Parts {
  const rng = createRng(20261116)
  const parts: Parts = { wood: [], leaves: [], needles: [], palms: [], rocks: [] }

  // Trees, by zone: dense mixed forest on the foothills, scattered broadleaf on
  // the plain, pines up high, palms on the beach, small willows by the river.
  let trees = 0
  for (let i = 0; i < 9000 && trees < treeLimit; i++) {
    const x = -380 + rng() * 560
    const z = -380 + rng() * 760
    const chance = rng()
    const kind = rng()
    const s = 0.8 + rng() * 0.8
    if (flatness(x, z) > 0.02) continue
    const biome = biomeAt(x, z)
    if (chance > TREE_DENSITY[biome]) continue
    const h = getTerrainHeight(x, z) - 0.1
    if (biome === 'beach') {
      if (h < 0.7) continue
      addPalm(parts, x, h, z, s, rng)
    } else if (biome === 'highland') addPine(parts, x, h, z, s, rng)
    else if (biome === 'forest') {
      if (kind < 0.4) addPine(parts, x, h, z, s * 1.15, rng)
      else addBroadleaf(parts, x, h, z, s * 1.2, rng, true)
    } else if (biome === 'riverbank') addBroadleaf(parts, x, h, z, s * 0.75, rng, true)
    else addBroadleaf(parts, x, h, z, s, rng)
    trees++
  }

  // Undergrowth: bushes of leaf cards on the plain, thicker and darker under the forest.
  for (let i = 0, bushes = 0; i < 4000 && bushes < 380; i++) {
    const x = -260 + rng() * 420
    const z = -260 + rng() * 520
    const keep = rng()
    if (flatness(x, z) > 0.4) continue
    const biome = biomeAt(x, z)
    if (biome !== 'plain' && biome !== 'forest') continue
    if (keep > (biome === 'forest' ? 0.6 : 0.16)) continue
    const h = getTerrainHeight(x, z)
    const base = new THREE.Color(pick(BUSH_GREENS, rng))
    if (biome === 'forest') base.lerp(SHADE, 0.3)
    const r = 0.5 + rng() * 0.4
    for (let k = 0; k < 6; k++) {
      const a = rng() * TAU
      const d = rng() * r * 0.7
      const size = r * (1.1 + rng() * 0.6)
      parts.leaves.push({
        position: [x + Math.cos(a) * d, h + size * 0.38 + rng() * r * 0.3, z + Math.sin(a) * d],
        scale: [size, size * 0.8, size],
        euler: [(rng() - 0.5) * 0.9, rng() * TAU, (rng() - 0.5) * 0.6],
        spin: 0,
        color: leafColor(base, k / 5, rng),
      })
    }
    bushes++
  }

  // Rocks: stones along the river and the beach, larger boulders on the high slopes.
  for (let i = 0; i < 9000 && parts.rocks.length < 260; i++) {
    const x = -340 + rng() * 520
    const z = -300 + rng() * 600
    const keep = rng()
    const biome = biomeAt(x, z)
    if (biome !== 'riverbank' && biome !== 'beach' && biome !== 'highland') continue
    if (biome === 'highland' && keep > 0.05) continue
    const h = getTerrainHeight(x, z)
    const r = (biome === 'highland' ? 0.8 : 0.35) + rng() * rng() * 1.5
    parts.rocks.push({
      position: [x, h + r * 0.2, z],
      scale: [r * (0.8 + rng() * 0.6), r * (0.55 + rng() * 0.35), r * (0.8 + rng() * 0.6)],
      spin: rng() * TAU,
      color: new THREE.Color(pick(ROCK_GREYS, rng)),
    })
  }

  return parts
}

// ---------------------------------------------------------------- drawing

const UP = new THREE.Vector3(0, 1, 0)

function buildInstanced(geometry: THREE.BufferGeometry, material: THREE.Material, instances: Instance[]): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, instances.length))
  mesh.count = instances.length
  const matrix = new THREE.Matrix4()
  const rotation = new THREE.Quaternion()
  const spin = new THREE.Quaternion()
  const direction = new THREE.Vector3()
  const position = new THREE.Vector3()
  const scale = new THREE.Vector3()
  const euler = new THREE.Euler(0, 0, 0, 'YXZ')
  instances.forEach((instance, i) => {
    if (instance.euler) {
      rotation.setFromEuler(euler.set(instance.euler[0], instance.euler[1], instance.euler[2], 'YXZ'))
    } else {
      spin.setFromAxisAngle(UP, instance.spin)
      if (instance.direction) rotation.setFromUnitVectors(UP, direction.set(...instance.direction).normalize()).multiply(spin)
      else rotation.copy(spin)
    }
    matrix.compose(position.set(...instance.position), rotation, scale.set(...instance.scale))
    mesh.setMatrixAt(i, matrix)
    mesh.setColorAt(i, instance.color)
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere()
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export function emptyParts(): Parts {
  return { wood: [], leaves: [], needles: [], palms: [], rocks: [] }
}

/** Shared textures, geometries and materials for every tree, placed or wild. */
let shared: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] } | null = null

export function treeResources() {
  if (!shared) {
    const gradientMap = getToonGradient()
    const cardMaterial = (map: THREE.Texture) => new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap, map, alphaTest: 0.5, side: THREE.DoubleSide })
    const fronds = frondGeometry()
    shared = {
      geometries: [new THREE.CylinderGeometry(0.62, 1, 1, 8), leafCardGeometry(), fronds, fronds, new THREE.DodecahedronGeometry(1, 0)],
      materials: [
        new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap }),
        cardMaterial(leafClusterTexture(7)),
        cardMaterial(sprigTexture('needle', 11)),
        cardMaterial(sprigTexture('palm', 13)),
        new THREE.MeshLambertMaterial({ flatShading: true }),
      ],
    }
  }
  return shared
}

/** One instanced mesh per part kind (wood, leaves, needles, palms, rocks), sharing all resources. */
export function buildPartMeshes(parts: Parts): THREE.InstancedMesh[] {
  const { geometries, materials } = treeResources()
  const lists = [parts.wood, parts.leaves, parts.needles, parts.palms, parts.rocks]
  return lists.map((list, i) => buildInstanced(geometries[i], materials[i], list))
}

export function Scenery() {
  const meshes = useMemo(() => buildPartMeshes(generate(Math.round(640 * QUALITY[useEditorStore.getState().qualityLevel].trees))), [])

  useEffect(() => () => meshes.forEach((mesh) => mesh.dispose()), [meshes])

  return (
    <group>
      {meshes.map((mesh, i) => (
        <primitive key={i} object={mesh} />
      ))}
    </group>
  )
}
