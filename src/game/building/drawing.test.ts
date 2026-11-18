import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from '../../stores/editorStore'
import { useWorldStore } from '../../stores/worldStore'
import { clearHistory, undo } from '../core/history'
import { buildDrawnParts, DRAW_DEFAULTS, snapDirection, type Pt } from './drawing'
import { addRoofToSelection, finishDrawing, footprintOf } from './drawActions'
import { decomposeFootprint } from './footprint'
import { worldAabb } from './snapping'
import { planOpenings } from './autoOpenings'
import { computeWallHoles } from './openings'
import { buildRoofParts } from './roof'
import type { WorldObject } from '../../types/world'

const flat = () => 2
const slope = (x: number) => 2 + x * 0.1

describe('drawn walls', () => {
  const square: Pt[] = [[0, 0], [4, 0], [4, 3], [0, 3]]

  it('makes one wall per side of a closed loop and none overlap on their top faces', () => {
    const parts = buildDrawnParts(square, true, DRAW_DEFAULTS.wall, flat)
    expect(parts).toHaveLength(4)
    // Each wall is trimmed at its start and extended at its end by half a thickness, so the loop's
    // total length is exactly the perimeter.
    const total = parts.reduce((sum, p) => sum + (p.geometry.shape === 'box' ? p.geometry.depth : 0), 0)
    expect(total).toBeCloseTo(14, 2)
    expect(parts[0].position[1]).toBeCloseTo(2 - 0.05 + (2.6 + 0.05) / 2, 3)
  })

  it('leaves the ends of an open line flush with the clicked points', () => {
    const parts = buildDrawnParts([[0, 0], [5, 0]], false, DRAW_DEFAULTS.wall, flat)
    expect(parts).toHaveLength(1)
    expect(parts[0].geometry).toMatchObject({ depth: 5, width: 0.2 })
    expect(parts[0].position[2]).toBeCloseTo(0)
    expect(parts[0].position[0]).toBeCloseTo(2.5)
  })

  it('stands on the lowest ground and is taller by the slope', () => {
    const [wall] = buildDrawnParts([[0, 0], [10, 0]], false, DRAW_DEFAULTS.wall, slope)
    expect(wall.geometry).toMatchObject({ height: 2.6 + 1 + 0.05 })
    const bottom = wall.position[1] - (wall.geometry as { height: number }).height / 2
    expect(bottom).toBeCloseTo(2 - 0.05, 2)
  })

  it('skips segments that are too short to be a wall', () => {
    expect(buildDrawnParts([[0, 0], [0.01, 0]], false, DRAW_DEFAULTS.wall, flat)).toHaveLength(0)
  })
})

describe('fences and paths', () => {
  it('puts a post every two meters or less, with two rails per section', () => {
    const parts = buildDrawnParts([[0, 0], [6, 0]], false, DRAW_DEFAULTS.fence, flat)
    expect(parts.filter((p) => p.name === 'Cột hàng rào')).toHaveLength(4)
    expect(parts.filter((p) => p.name === 'Thanh hàng rào')).toHaveLength(2)
  })

  it('does not double the first post when a fence closes', () => {
    const parts = buildDrawnParts([[0, 0], [2, 0], [2, 2], [0, 2]], true, DRAW_DEFAULTS.fence, flat)
    expect(parts.filter((p) => p.name === 'Cột hàng rào')).toHaveLength(4)
  })

  it('lays a path in short pieces that follow the slope, with a pad at each bend', () => {
    const parts = buildDrawnParts([[0, 0], [5, 0], [5, 5]], false, DRAW_DEFAULTS.path, slope)
    expect(parts.length).toBe(2 + 2 + 1)
    expect(parts[0].rotation[0]).not.toBe(0)
  })
})

describe('direction snapping', () => {
  it('pulls a nearly straight line onto the axis and rounds its length to the grid', () => {
    const snapped = snapDirection([0, 0], [3.02, 0.1], 0.1)
    expect(snapped[0]).toBeCloseTo(3, 1)
    expect(snapped[1]).toBeCloseTo(0, 5)
  })

  it('snaps a near-diagonal onto 45 degrees and leaves other angles alone', () => {
    const diagonal = snapDirection([0, 0], [2, 2.1], 0.1)
    expect(diagonal[0]).toBeCloseTo(diagonal[1], 5)
    expect(snapDirection([0, 0], [3, 1], 0.1)).toEqual([3, 1])
  })
})

describe('automatic roof', () => {
  it('covers the footprint of the walls, ridge along the longer side', () => {
    const walls = buildDrawnParts([[0, 0], [8, 0], [8, 4], [0, 4]], true, DRAW_DEFAULTS.wall, flat)
    const objects = walls.map((part, i) => ({
      id: `w${i}`, type: part.type, name: part.name, materialId: part.materialId, geometry: part.geometry,
      transform: { position: part.position, rotation: part.rotation }, locked: false,
    }))
    const box = footprintOf(objects)!
    expect(box.x1 - box.x0).toBeCloseTo(8.2, 1)
    const roof = buildRoofParts(box, 30, { materialId: 'brick_red_painted' })
    expect(roof.map((p) => p.name)).toEqual(['Mái trước', 'Mái sau', 'Nóc mái', 'Đầu hồi', 'Đầu hồi'])
    // The ridge sits half a span times tan(pitch) above the walls.
    const ridge = roof.find((p) => p.name === 'Nóc mái')!
    expect(ridge.position[1]).toBeCloseTo(box.top + ((box.z1 - box.z0) / 2) * Math.tan(Math.PI / 6) + 0.1, 2)
  })
})

describe('drawing actions', () => {
  beforeEach(() => {
    useWorldStore.setState({ objects: {}, order: [] })
    useEditorStore.setState({ drawPoints: [], selectedIds: [], drawKind: 'wall' })
    clearHistory()
  })

  it('turns the clicked points into one undoable group that ends up selected', () => {
    useEditorStore.setState({ drawPoints: [[0, 0], [4, 0], [4, 4], [0, 4]] })
    finishDrawing(true)
    const world = useWorldStore.getState()
    expect(world.order).toHaveLength(4)
    expect(new Set(world.order.map((id) => world.objects[id].groupId)).size).toBe(1)
    expect(useEditorStore.getState().selectedIds).toHaveLength(4)
    expect(useEditorStore.getState().drawPoints).toEqual([])
    undo()
    expect(useWorldStore.getState().order).toHaveLength(0)
  })

  it('adds a roof over the selected walls as another group', () => {
    useEditorStore.setState({ drawPoints: [[0, 0], [6, 0], [6, 4], [0, 4]] })
    finishDrawing(true)
    addRoofToSelection(35)
    const world = useWorldStore.getState()
    expect(world.order).toHaveLength(4 + 5)
    expect(Object.values(world.objects).filter((o) => o.type === 'roof')).toHaveLength(3)
  })
})

describe('roof kinds', () => {
  const box = { x0: 0, x1: 8, z0: 0, z1: 4, top: 3 }

  it('hip roof: four sloped faces and a ridge shorter than the house', () => {
    const roof = buildRoofParts(box, 30, { materialId: 'x' }, 'hip')
    expect(roof.map((p) => p.name)).toEqual(['Mái trước', 'Mái sau', 'Mái hông phải', 'Mái hông trái', 'Nóc mái'])
    const front = roof[0].geometry
    expect(front.shape).toBe('extrude')
    if (front.shape === 'extrude') expect(front.points).toHaveLength(4) // trapezoid
    const end = roof[2].geometry
    if (end.shape === 'extrude') expect(end.points).toHaveLength(3) // triangle
    // Span 4.9 (with overhang): the ridge is span / 2 * tan(30°) above the eaves.
    const ridge = roof[4]
    const eave = 3 - 0.45 * Math.tan(Math.PI / 6)
    expect(ridge.position[1]).toBeCloseTo(eave + (4.9 / 2) * Math.tan(Math.PI / 6) + 0.1, 2)
  })

  it('hip roof over a square footprint comes to a point (four triangles, no ridge)', () => {
    const roof = buildRoofParts({ x0: 0, x1: 4, z0: 0, z1: 4, top: 3 }, 30, { materialId: 'x' }, 'hip')
    expect(roof).toHaveLength(4)
    for (const part of roof) if (part.geometry.shape === 'extrude') expect(part.geometry.points).toHaveLength(3)
  })

  it('flat roof is one slab wider than the walls', () => {
    const roof = buildRoofParts(box, 30, { materialId: 'x' }, 'flat')
    expect(roof).toHaveLength(1)
    expect(roof[0].geometry).toMatchObject({ width: 8.5, depth: 4.5 })
    expect(roof[0].position[1]).toBeCloseTo(3.1)
  })
})

describe('corner pillars', () => {
  it('adds none at right angles and one at each odd corner', () => {
    expect(buildDrawnParts([[0, 0], [4, 0], [4, 3], [0, 3]], true, DRAW_DEFAULTS.wall, flat).filter((p) => p.name === 'Trụ góc tường')).toHaveLength(0)
    const triangle = buildDrawnParts([[0, 0], [4, 0], [2, 3]], true, DRAW_DEFAULTS.wall, flat)
    expect(triangle.filter((p) => p.name === 'Trụ góc tường')).toHaveLength(3)
  })
})

describe('automatic doors and windows', () => {
  const room = (): WorldObject[] =>
    buildDrawnParts([[0, 0], [8, 0], [8, 5], [0, 5]], true, DRAW_DEFAULTS.wall, flat).map((part, i) => ({
      id: `w${i}`, type: part.type, name: part.name, materialId: part.materialId, geometry: part.geometry,
      transform: { position: part.position, rotation: part.rotation }, locked: false, groupId: 'room',
    }))

  it('puts one door on the longest wall and windows on the walls, all facing out', () => {
    const plans = planOpenings(room())
    expect(plans.filter((p) => p.kind === 'door')).toHaveLength(1)
    expect(plans.filter((p) => p.kind === 'window').length).toBeGreaterThanOrEqual(4)
    // The room's centre is (4, 2.5): every opening faces away from it.
    for (const plan of plans) {
      const out = [plan.position[0] - 4, plan.position[2] - 2.5]
      expect(Math.sin(plan.yaw) * out[0] + Math.cos(plan.yaw) * out[1]).toBeGreaterThan(0)
    }
  })

  it('leaves a wall alone when it already has an opening, and every opening sits inside its wall', () => {
    const walls = room()
    const plans = planOpenings(walls, new Set([walls[0].id]))
    const all = planOpenings(walls)
    expect(plans.length).toBeLessThan(all.length)
    for (const plan of all) {
      const holes = computeWallHoles([
        ...walls,
        {
          id: 'o', type: plan.kind, name: plan.kind, materialId: 'x', locked: false,
          geometry: plan.kind === 'door'
            ? { shape: 'door', width: plan.width, height: plan.height, thickness: 0.14, hinge: 'left' }
            : { shape: 'window', width: plan.width, height: plan.height, thickness: 0.14 },
          transform: { position: plan.position, rotation: [0, plan.yaw, 0] },
        },
      ])
      expect(Object.keys(holes).length).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('roof over non-rectangular rooms', () => {
  const walls = (points: Pt[]) =>
    buildDrawnParts(points, true, DRAW_DEFAULTS.wall, flat).map((part, i) => ({
      id: `w${i}`, type: part.type, name: part.name, materialId: part.materialId, geometry: part.geometry,
      transform: { position: part.position, rotation: part.rotation }, locked: false,
    }))
  const boxesOf = (objects: ReturnType<typeof walls>) =>
    objects.map((obj) => {
      const aabb = worldAabb(obj.geometry, obj.transform.position, obj.transform.rotation)
      return { x0: aabb.min[0], x1: aabb.max[0], z0: aabb.min[2], z1: aabb.max[2] }
    })

  it('a plain rectangle stays one piece', () => {
    const plan = decomposeFootprint(boxesOf(walls([[0, 0], [8, 0], [8, 5], [0, 5]])))
    expect(plan.enclosed).toBe(true)
    expect(plan.rects).toHaveLength(1)
    expect(plan.rects[0].x1 - plan.rects[0].x0).toBeCloseTo(8.2, 1)
  })

  it('an L shape is cut into two rectangles that together cover the whole footprint', () => {
    const plan = decomposeFootprint(boxesOf(walls([[0, 0], [10, 0], [10, 4], [5, 4], [5, 8], [0, 8]])))
    expect(plan.rects).toHaveLength(2)
    const area = plan.rects.reduce((sum, r) => sum + (r.x1 - r.x0) * (r.z1 - r.z0), 0)
    // Outer L: 10.2 x 8.2 minus the 5 x 4 notch (walls included on the outside, 0.1 each side).
    expect(area).toBeCloseTo(10.2 * 4.2 + 5.2 * 4, 0)
    expect(plan.covers(2, 6)).toBe(true)
    expect(plan.covers(8, 6)).toBe(false)
  })

  it('a T shape and a U shape are cut into pieces too', () => {
    expect(decomposeFootprint(boxesOf(walls([[0, 0], [12, 0], [12, 4], [8, 4], [8, 9], [4, 9], [4, 4], [0, 4]]))).rects).toHaveLength(2)
    expect(decomposeFootprint(boxesOf(walls([[0, 0], [12, 0], [12, 8], [8, 8], [8, 4], [4, 4], [4, 8], [0, 8]]))).rects).toHaveLength(3)
  })

  it('open walls (no enclosed space) fall back to the single bounding rectangle', () => {
    const open = walls([[0, 0], [6, 0], [6, 4]]).slice(0, 2)
    const plan = decomposeFootprint(boxesOf(open))
    expect(plan.enclosed).toBe(false)
    expect(plan.rects).toHaveLength(1)
  })

  it('roofs an L-shaped selection with one closed roof per rectangle', () => {
    useWorldStore.setState({ objects: {}, order: [] })
    useEditorStore.setState({ drawPoints: [[0, 0], [10, 0], [10, 4], [5, 4], [5, 8], [0, 8]], selectedIds: [], drawKind: 'wall' })
    clearHistory()
    finishDrawing(true)
    const before = useWorldStore.getState().order.length
    addRoofToSelection(30, 'gable')
    const roof = Object.values(useWorldStore.getState().objects).filter((o) => o.type === 'roof' || o.name.startsWith('Đầu hồi'))
    expect(useWorldStore.getState().order.length).toBeGreaterThan(before)
    expect(roof.filter((o) => o.name.startsWith('Mái') && o.name.includes('khối 1')).length).toBeGreaterThan(0)
    expect(roof.filter((o) => o.name.includes('khối 2')).length).toBeGreaterThan(0)
    // Two rectangles, each with two roof boards, a ridge and two closed gable ends.
    expect(roof.filter((o) => o.name.startsWith('Đầu hồi'))).toHaveLength(4)
    expect(roof.filter((o) => o.name.startsWith('Mái '))).toHaveLength(4)
  })
})
