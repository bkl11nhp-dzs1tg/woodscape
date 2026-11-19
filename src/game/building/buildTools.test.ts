import { Euler, Vector3 } from 'three'
import { beforeEach, describe, expect, it } from 'vitest'
import { createObjectFromPreset, getShapePreset } from '../../data/shapePresets'
import { useEditorStore } from '../../stores/editorStore'
import { useWorldStore } from '../../stores/worldStore'
import type { WorldObject } from '../../types/world'
import { getTerrainHeight } from '../environment/terrain'
import { clearHistory, undo } from '../core/history'
import { createGeometry } from '../geometry/GeometryFactory'
import { addObject } from './commands'
import { buildStairs, captureCluster, instantiateCluster, STAIR_DEFAULTS } from './clusters'
import { repeatAroundRing, repeatInLine } from './repeatActions'
import { coverFaceWithTiles, fillGroundRect, floorInsideWalls } from './tilingActions'

const world = () => useWorldStore.getState().objects

function put(preset: string, id: string, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]): WorldObject {
  const obj = createObjectFromPreset(getShapePreset(preset)!, id, position, rotation)
  addObject(obj)
  return obj
}

beforeEach(() => {
  useWorldStore.setState({ objects: {}, order: [] })
  useEditorStore.setState({ selectedIds: [] })
  clearHistory()
})

describe('wedge', () => {
  it('has a vertical side on the chosen end and the same box as the isosceles prism', () => {
    const wedge = createGeometry({ shape: 'prism', width: 2, height: 1, depth: 0.5, lean: 'right' })
    wedge.computeBoundingBox()
    expect(wedge.boundingBox!.max.x).toBeCloseTo(1)
    expect(wedge.boundingBox!.max.y).toBeCloseTo(0.5)
    const positions = wedge.getAttribute('position')
    const top = [...Array(positions.count).keys()].filter((i) => positions.getY(i) > 0.49)
    // every top vertex sits over the upright end
    expect(top.every((i) => Math.abs(positions.getX(i) - 1) < 1e-6)).toBe(true)
    expect(positions.count).toBe(3 + 3 + 6 + 6 + 6)
  })
})

describe('repeat', () => {
  it('repeats a selection in a line, edge to edge by default spacing, as one group', () => {
    const a = put('preset_post', 'a', [0, 1, 0])
    const ids = repeatInLine([a.id], 3, 'x', 1, 'Hàng cột')
    expect(ids).toHaveLength(3)
    expect(ids.map((id) => world()[id].transform.position[0]).sort()).toEqual([1, 2, 3])
    expect(new Set(ids.map((id) => world()[id].groupName))).toEqual(new Set(['Hàng cột']))
    undo()
    expect(Object.keys(world())).toEqual(['a'])
  })

  it('places copies around a ring, each at the same distance from the centre', () => {
    const a = put('preset_post', 'a', [10, 1, 0])
    const ids = repeatAroundRing([a.id], 3, 4, '')
    const centre = new Vector3(10 - 4, 0, 0)
    for (const id of ids) {
      const p = world()[id].transform.position
      expect(Math.hypot(p[0] - centre.x, p[2] - centre.z)).toBeCloseTo(4, 2)
    }
    expect(new Set(ids.map((id) => world()[id].transform.rotation[1].toFixed(2))).size).toBe(3)
  })
})

describe('clusters', () => {
  it('captures a selection relative to its middle and places it back turned', () => {
    const a = put('preset_post', 'a', [5, 1.1, 5])
    const b = put('preset_post', 'b', [7, 1.1, 5])
    const template = captureCluster([a, b], 'Hai cột')!
    expect(template.size[0]).toBeCloseTo(2.12)
    const placed = instantiateCluster(template.parts, template.name, [0, 1.1, 0], Math.PI / 2)
    expect(new Set(placed.map((o) => o.groupId)).size).toBe(1)
    expect(placed.every((o) => o.groupName === 'Hai cột')).toBe(true)
    // turned a quarter: the pair now stands along Z
    expect(Math.abs(placed[0].transform.position[2] - placed[1].transform.position[2])).toBeCloseTo(2)
  })

  it('builds stairs whose steps rise by the set height', () => {
    const stairs = buildStairs({ ...STAIR_DEFAULTS, steps: 5, rise: 0.2, run: 0.3, width: 1.2 })
    expect(stairs.parts.filter((p) => p.type === 'stair_step')).toHaveLength(5)
    expect(stairs.parts.filter((p) => p.type === 'stair_side')).toHaveLength(2)
    expect(stairs.size[1]).toBeCloseTo(1)
    const tops = stairs.parts.filter((p) => p.type === 'stair_step').map((p) => p.transform.position[1] + (p.geometry as { height: number }).height / 2)
    tops.forEach((top, i) => expect(top - tops[0]).toBeCloseTo(i * 0.2))
  })
})

describe('resting on terrain', () => {
  it('keeps every corner of each floor piece above the ground and tilts pieces on a slope', () => {
    // search for a slope in the valley
    let spot: [number, number] = [0, 0]
    let steepest = 0
    for (let x = -150; x < 150; x += 6) {
      for (let z = -150; z < 150; z += 6) {
        const s = Math.abs(getTerrainHeight(x + 1, z) - getTerrainHeight(x, z))
        if (s > steepest) {
          steepest = s
          spot = [x, z]
        }
      }
    }
    expect(steepest).toBeGreaterThan(0.05)
    const tile = put('preset_floor_tile', 'tile', [spot[0], 0, spot[1]])
    const ids = fillGroundRect(tile.id, { x0: spot[0], x1: spot[0] + 4, z0: spot[1], z1: spot[1] + 4 }, { gap: 0, pattern: 'grid', cutToFit: true, groupName: 'Sàn' })
    expect(ids.length).toBeGreaterThan(0)
    let tilted = 0
    for (const id of ids) {
      const obj = world()[id]
      const g = obj.geometry as { width: number; height: number; depth: number }
      const euler = new Euler(...obj.transform.rotation)
      if (Math.abs(euler.x) > 1e-3 || Math.abs(euler.z) > 1e-3) tilted++
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const corner = new Vector3((sx * g.width) / 2, -g.height / 2, (sz * g.depth) / 2).applyEuler(euler).add(new Vector3(...obj.transform.position))
          expect(corner.y).toBeGreaterThanOrEqual(getTerrainHeight(corner.x, corner.z) - 0.002)
        }
      }
    }
    expect(tilted).toBeGreaterThan(0)
  })
})

describe('cover and floor', () => {
  it('covers a wall face with bricks and skips the ones that would hide a door', () => {
    put('preset_brick_wall', 'wall', [0, 0.375, 0])
    useWorldStore.getState().applyPatch({ wall: { ...world().wall, geometry: { shape: 'box', width: 4, height: 2, depth: 0.2 } } })
    const plain = coverFaceWithTiles('wall', 'front', 'preset_brick', { gap: 0.005, cutToFit: true, groupName: '' })
    expect(plain.length).toBeGreaterThan(100)
    // all bricks stand just in front of the wall face
    for (const id of plain) expect(world()[id].transform.position[2]).toBeGreaterThan(0.1)
    undo()
    put('preset_door', 'door', [0, 1, 0])
    const withDoor = coverFaceWithTiles('wall', 'front', 'preset_brick', { gap: 0.005, cutToFit: true, groupName: '' })
    expect(withDoor.length).toBeLessThan(plain.length)
  })

  it('lays a floor inside selected walls', () => {
    useWorldStore.getState().applyPatch({
      n: { ...createObjectFromPreset(getShapePreset('preset_brick_wall')!, 'n', [0, 1, -2]), geometry: { shape: 'box', width: 4.2, height: 2, depth: 0.2 } },
      s: { ...createObjectFromPreset(getShapePreset('preset_brick_wall')!, 's', [0, 1, 2]), geometry: { shape: 'box', width: 4.2, height: 2, depth: 0.2 } },
    })
    const ids = floorInsideWalls(['n', 's'], 'preset_floor_tile', { gap: 0.002, groupName: 'Sàn nhà' })
    expect(ids.length).toBeGreaterThan(20)
    expect(world()[ids[0]].groupName).toBe('Sàn nhà')
  })
})
