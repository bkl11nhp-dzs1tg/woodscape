/**
 * Coastal Valley terrain, defined as a pure height function so that the mesh,
 * scenery placement and (later) snapping/physics all agree.
 *
 * Layout (meters, Y up): sea to the east (+X), hills to the west/north/south,
 * a river meandering west -> east through a grassy plain with flat build zones.
 * Sea and river surface are at y = 0.
 */

export const TERRAIN_SIZE = 800
export const WATER_LEVEL = 0
const PLAIN_HEIGHT = 2.4

export interface BuildZone {
  id: string
  name: string
  x: number
  z: number
  radius: number
}

export const BUILD_ZONES: readonly BuildZone[] = [
  { id: 'zone_riverside', name: 'Bãi cỏ ven sông', x: 10, z: 56, radius: 40 },
  { id: 'zone_south_meadow', name: 'Đồng cỏ phía nam', x: -50, z: -76, radius: 60 },
  { id: 'zone_coast_view', name: 'Khoảng đất nhìn ra biển', x: 70, z: -38, radius: 32 },
]

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function hash(ix: number, iz: number): number {
  const n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function valueNoise(x: number, z: number): number {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = x - ix
  const fz = z - iz
  const sx = fx * fx * (3 - 2 * fx)
  const sz = fz * fz * (3 - 2 * fz)
  return lerp(
    lerp(hash(ix, iz), hash(ix + 1, iz), sx),
    lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), sx),
    sz,
  )
}

/** Fractal noise in 0..1. */
export function fbm(x: number, z: number, octaves = 4): number {
  let sum = 0
  let amplitude = 0.5
  let total = 0
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x, z) * amplitude
    total += amplitude
    x *= 2.03
    z *= 2.03
    amplitude *= 0.5
  }
  return sum / total
}

/** 0 on the plain, 1 deep in the surrounding hills. */
export function hillMask(x: number, z: number): number {
  return Math.max(smoothstep(100, 260, -x), smoothstep(120, 280, Math.abs(z)))
}

/** 1 inside a build zone, fading to 0 outside. */
export function flatness(x: number, z: number): number {
  let f = 0
  for (const zone of BUILD_ZONES) {
    const d = Math.hypot(x - zone.x, z - zone.z)
    f = Math.max(f, 1 - smoothstep(zone.radius * 0.7, zone.radius * 1.3, d))
  }
  return f
}

export function riverCenterZ(x: number): number {
  return 25 * Math.sin(x * 0.018) + 10 * Math.sin(x * 0.041 + 1) - 5
}

/** 0 on land, 1 out at sea. */
export function coastFactor(x: number, z: number): number {
  const coastX = x + 14 * Math.sin(z * 0.017) + 6 * Math.sin(z * 0.043 + 1.3)
  return smoothstep(105, 190, coastX)
}

export function getTerrainHeight(x: number, z: number): number {
  const hills = hillMask(x, z)
  const flat = flatness(x, z)

  let h = PLAIN_HEIGHT + (fbm(x * 0.03, z * 0.03) - 0.5) * 1.6 * (1 - flat)
  h += hills * (8 + 30 * fbm(x * 0.008 + 10, z * 0.008 + 10)) + hills * hills * 18
  h = lerp(h, -7, coastFactor(x, z))

  const d = Math.abs(z - riverCenterZ(x))
  const halfWidth = 6 + 5 * smoothstep(40, 130, x)
  const bank = 9 + hills * 40
  const carve = 1 - smoothstep(halfWidth, halfWidth + bank, d)
  return lerp(h, Math.min(h, -1.8), carve)
}

/**
 * Landscape zones. Each has its own ground color and plants (see Scenery and Grass):
 *  - beach:     sand by the sea; palms, dune grass, driftwood rocks.
 *  - riverbank: low wet ground along the river; reeds, willows, stones.
 *  - plain:     the open meadow in the middle; scattered broadleaf trees, flowers.
 *  - forest:    the foothills ringing the valley; dense mixed woodland, ferns, few flowers.
 *  - highland:  the upper slopes; dry grass, sparse pines, boulders.
 */
export type Biome = 'water' | 'beach' | 'riverbank' | 'plain' | 'forest' | 'highland'

/** 1 inside the forest belt on the foothills, 0 on the open plain and on the high slopes. */
export function forestFactor(x: number, z: number): number {
  const hills = hillMask(x, z)
  return smoothstep(0.015, 0.1, hills) * (1 - smoothstep(0.45, 0.62, hills))
}

export function biomeAt(x: number, z: number): Biome {
  const h = getTerrainHeight(x, z)
  if (h < WATER_LEVEL) return 'water'
  if (coastFactor(x, z) > 0.03 && h < 2.3) return 'beach'
  if (h < 1.3) return 'riverbank'
  if (hillMask(x, z) > 0.55) return 'highland'
  return forestFactor(x, z) > 0.5 ? 'forest' : 'plain'
}
