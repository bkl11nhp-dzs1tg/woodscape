import { describe, expect, it } from 'vitest'
import { BOX_FACES } from '../../types/world'
import { resolveFaceMaterialIds } from '../building/faceMaterials'
import { BUILD_ZONES, getTerrainHeight, riverCenterZ } from '../environment/terrain'
import { formatLength } from '../../services/units'
import { createGeometry, getDimensions, getGeometry } from './GeometryFactory'

function uvRange(geometry: ReturnType<typeof createGeometry>, start: number, count: number) {
  const uv = geometry.getAttribute('uv')
  let maxU = 0
  let maxV = 0
  for (let i = start; i < start + count; i++) {
    maxU = Math.max(maxU, uv.getX(i))
    maxV = Math.max(maxV, uv.getY(i))
  }
  return [Number(maxU.toFixed(5)), Number(maxV.toFixed(5))]
}

describe('GeometryFactory', () => {
  it('builds a box with six real faces as six material groups', () => {
    const geometry = createGeometry({ shape: 'box', width: 0.15, height: 0.1, depth: 2.4 })
    expect(geometry.groups).toHaveLength(6)
    expect(geometry.groups.map((g) => g.materialIndex)).toEqual([0, 1, 2, 3, 4, 5])
    expect(geometry.getAttribute('position').count).toBe(24)
    geometry.computeBoundingBox()
    const size = geometry.boundingBox!.max.clone().sub(geometry.boundingBox!.min)
    expect(size.x).toBeCloseTo(0.15)
    expect(size.y).toBeCloseTo(0.1)
    expect(size.z).toBeCloseTo(2.4)
  })

  it('keeps box UVs upright by default so brick courses stay horizontal', () => {
    const wallEnd = createGeometry({ shape: 'box', width: 0.22, height: 2.6, depth: 4 })
    // front face: 0.22 wide, 2.6 tall; V must still run up the wall
    expect(uvRange(wallEnd, 16, 4)).toEqual([0.22, 2.6])
  })

  it('writes wood box UVs in meters with U along the longer edge of each face', () => {
    const geometry = createGeometry({ shape: 'box', width: 0.15, height: 0.1, depth: 2.4 }, true)
    // right face: 2.4 long, 0.1 tall
    expect(uvRange(geometry, 0, 4)).toEqual([2.4, 0.1])
    // top face: 0.15 wide (default U) but 2.4 deep, so U is swapped onto the length
    expect(uvRange(geometry, 8, 4)).toEqual([2.4, 0.15])
    // front (end) face
    expect(uvRange(geometry, 16, 4)).toEqual([0.15, 0.1])
  })

  it('treats a panel as a thin box and reports dimensions for every shape', () => {
    expect(getDimensions({ shape: 'panel', width: 1.2, height: 0.9, thickness: 0.03 })).toEqual({
      width: 1.2,
      height: 0.9,
      depth: 0.03,
    })
    expect(getDimensions({ shape: 'sphere', radius: 0.4 })).toEqual({ width: 0.8, height: 0.8, depth: 0.8 })
    expect(getDimensions({ shape: 'cone', radius: 0.5, height: 2 })).toEqual({ width: 1, height: 2, depth: 1 })
    expect(createGeometry({ shape: 'panel', width: 1.2, height: 0.9, thickness: 0.03 }).groups).toHaveLength(6)
  })

  it('builds a triangular prism with five flat faces inside its stated dimensions', () => {
    const geometry = createGeometry({ shape: 'prism', width: 4, height: 2, depth: 0.22 })
    // 2 triangles + 3 quads = 8 triangles
    expect(geometry.getAttribute('position').count).toBe(24)
    geometry.computeBoundingBox()
    const size = geometry.boundingBox!.max.clone().sub(geometry.boundingBox!.min)
    expect([size.x, size.y, size.z].map((v) => Number(v.toFixed(4)))).toEqual([4, 2, 0.22])
    // every face normal points away from the center
    const position = geometry.getAttribute('position')
    const normal = geometry.getAttribute('normal')
    for (let i = 0; i < position.count; i += 3) {
      const cx = (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3
      const cy = (position.getY(i) + position.getY(i + 1) + position.getY(i + 2)) / 3
      const cz = (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3
      expect(cx * normal.getX(i) + (cy + 0.2) * normal.getY(i) + cz * normal.getZ(i)).toBeGreaterThan(0)
    }
  })

  it('reuses cached geometry for identical parameters', () => {
    const a = getGeometry({ shape: 'cylinder', radius: 0.2, height: 1 })
    const b = getGeometry({ shape: 'cylinder', radius: 0.2, height: 1 })
    expect(a).toBe(b)
  })
})

describe('face materials', () => {
  it('falls back to the object material for faces without an override', () => {
    const ids = resolveFaceMaterialIds({
      materialId: 'pine_painted',
      faceMaterials: { front: 'pine_endgrain_painted', back: 'pine_endgrain_painted' },
    })
    expect(BOX_FACES).toEqual(['right', 'left', 'top', 'bottom', 'front', 'back'])
    expect(ids).toEqual([
      'pine_painted',
      'pine_painted',
      'pine_painted',
      'pine_painted',
      'pine_endgrain_painted',
      'pine_endgrain_painted',
    ])
  })
})

describe('Coastal Valley terrain', () => {
  it('keeps build zones flat, dry and clear of the river', () => {
    for (const zone of BUILD_ZONES) {
      const center = getTerrainHeight(zone.x, zone.z)
      expect(center).toBeGreaterThan(1.5)
      for (const [dx, dz] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
        expect(getTerrainHeight(zone.x + dx, zone.z + dz)).toBeCloseTo(center, 5)
      }
    }
  })

  it('puts the river bed and the open sea below water level', () => {
    expect(getTerrainHeight(0, riverCenterZ(0))).toBeLessThan(0)
    expect(getTerrainHeight(250, 0)).toBeLessThan(0)
  })
})

describe('units', () => {
  it('formats meters for display', () => {
    expect(formatLength(2.4, 'm')).toBe('2.40 m')
    expect(formatLength(0.1025, 'cm')).toBe('10.3 cm')
    expect(formatLength(0.215, 'mm')).toBe('215 mm')
  })
})
