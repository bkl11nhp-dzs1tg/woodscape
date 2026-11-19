import { beforeEach, describe, expect, it } from 'vitest'
import { useConstructionStore } from '../../stores/constructionStore'
import { useEditorStore } from '../../stores/editorStore'
import { useWorldStore } from '../../stores/worldStore'
import { clearHistory, undo, useHistoryStore } from '../core/history'
import { growth } from './growth'
import { getTerrainHeight } from '../environment/terrain'
import { buildHouse } from './houseBuilder'
import { HOUSE_PLANS, placePoint } from './housePlans'

const objects = () => Object.values(useWorldStore.getState().objects)
const instant = async () => undefined

beforeEach(() => {
  useWorldStore.setState({ objects: {}, order: [] })
  useEditorStore.setState({ selectedIds: [] })
  useConstructionStore.setState({ active: null, stopRequested: false })
  clearHistory()
  growth.clear()
})

describe('house plans', () => {
  it('turns points by whole quarter turns about the plot middle', () => {
    expect(placePoint([2, 1], [10, 20], 0)).toEqual([12, 21])
    const turned = placePoint([2, 1], [0, 0], 1)
    expect(turned[0]).toBeCloseTo(1)
    expect(turned[1]).toBeCloseTo(-2)
  })
})

describe('multi-storey houses', () => {
  it('stacks storeys with a slab between them and one door only on the ground floor', async () => {
    await buildHouse('house_villa', [0, 0], 0, instant)
    const all = objects()
    const slabs = all.filter((o) => o.type === 'floor_slab' && o.name.startsWith('Sàn tầng')).sort((a, b) => a.transform.position[1] - b.transform.position[1])
    expect(slabs.length).toBeGreaterThanOrEqual(3)
    // one grand entrance (the 1.6 m door); the other doors are doorways between rooms
    expect(all.filter((o) => o.type === 'door' && (o.geometry as { width: number }).width > 1.5)).toHaveLength(1)
    const wallTops = [...new Set(all.filter((o) => o.type === 'wall' && o.geometry.shape === 'box').map((o) => Math.round(o.transform.position[1] * 10)))]
    expect(wallTops.length).toBeGreaterThanOrEqual(3)
    // the roof sits above the highest wall
    const topWall = Math.max(...all.filter((o) => o.type === 'wall' && o.geometry.shape === 'box').map((o) => o.transform.position[1]))
    const roofY = Math.max(...all.filter((o) => o.type === 'roof').map((o) => o.transform.position[1]))
    // the ridge stands above the top of the highest wall (a wall is 3 m tall, so its top is 1.5 m over its middle)
    expect(roofY).toBeGreaterThan(topWall + 1.5)
  })
})

describe('rooms and floors', () => {
  it('divides the floor into rooms with doors between them', async () => {
    await buildHouse('house_villa', [0, 0], 0, instant)
    const all = objects()
    expect(all.filter((o) => o.name === 'Tường ngăn phòng').length).toBeGreaterThanOrEqual(5)
    // front door plus a doorway in each partition
    expect(all.filter((o) => o.type === 'door').length).toBeGreaterThanOrEqual(6)
  })

  it('keeps the ground floor above the ground everywhere under the house', async () => {
    await buildHouse('house_villa', [30, 40], 1, instant)
    const slabs = objects().filter((o) => o.type === 'floor_slab' && o.name.startsWith('Sàn tầng 1'))
    expect(slabs.length).toBeGreaterThanOrEqual(1)
    const top = Math.min(...slabs.map((o) => o.transform.position[1] + (o.geometry as { height: number }).height / 2))
    for (const slab of slabs) {
      const g = slab.geometry as { width: number; depth: number }
      const [cx, , cz] = slab.transform.position
      for (let x = -g.width / 2; x <= g.width / 2; x += 0.75) {
        for (let z = -g.depth / 2; z <= g.depth / 2; z += 0.75) expect(getTerrainHeight(cx + x, cz + z)).toBeLessThanOrEqual(top + 1e-6)
      }
    }
  })
})

describe('inside stairs', () => {
  it('links the floors: steps rise by one storey and the floor above has a hole for them', async () => {
    await buildHouse('house_townhouse', [0, 0], 0, instant)
    const all = objects()
    const steps = all.filter((o) => o.type === 'stair_step')
    expect(steps.length).toBeGreaterThanOrEqual(16)
    const tops = steps.map((o) => o.transform.position[1] + (o.geometry as { height: number }).height / 2)
    const floorTop = Math.min(...all.filter((o) => o.name === 'Sàn tầng 2').map((o) => o.transform.position[1] + (o.geometry as { height: number }).height / 2))
    // the highest step tops out at the level of the upper floor
    expect(Math.max(...tops)).toBeCloseTo(floorTop, 1)
    // the upper floor is in several pieces round the stairwell, not one slab
    expect(all.filter((o) => o.name.startsWith('Sàn tầng 2')).length).toBeGreaterThanOrEqual(2)
    expect(all.filter((o) => o.name.startsWith('Sàn tầng 1')).length).toBe(1)
  })
})

describe('buildHouse', () => {
  it.each(HOUSE_PLANS.map((plan) => plan.id))('%s: floor, walls, doors, windows and roof, all in one named group, undone in one step', async (id) => {
    await buildHouse(id, [0, 0], 0, instant)
    const all = objects()
    expect(all.filter((o) => o.type.includes('tile') || o.type.includes('plank') || o.type === 'floor_slab').length).toBeGreaterThanOrEqual(1)
    expect(all.filter((o) => o.type === 'wall').length).toBeGreaterThanOrEqual(4)
    expect(all.filter((o) => o.type === 'door').length).toBeGreaterThanOrEqual(1)
    expect(all.filter((o) => o.type === 'window').length).toBeGreaterThanOrEqual(1)
    expect(all.filter((o) => o.type === 'roof' || o.name.startsWith('Mái')).length).toBeGreaterThanOrEqual(1)
    const house = HOUSE_PLANS.find((plan) => plan.id === id)!
    expect(all.filter((o) => o.groupName === house.name).length).toBeGreaterThan(20)
    expect(useConstructionStore.getState().active).toBeNull()
    expect(useHistoryStore.getState().undoStack).toHaveLength(1)
    undo()
    expect(objects()).toHaveLength(0)
  })

  it('stops when asked and keeps what was built', async () => {
    let steps = 0
    const promise = buildHouse('house_cabin', [0, 0], 0, async () => {
      steps++
      if (steps === 3) useConstructionStore.setState({ stopRequested: true })
    })
    await promise
    expect(objects().length).toBeGreaterThan(0)
    expect(objects().some((o) => o.type === 'roof' || o.name.startsWith('Mái'))).toBe(false)
    expect(useConstructionStore.getState().active).toBeNull()
  })

  it('refuses a second build while one is running', async () => {
    let second: Promise<void> | null | undefined
    await buildHouse('house_cabin', [0, 0], 0, async () => {
      second ??= buildHouse('house_pavilion', [20, 0], 0, instant)
    })
    expect(second).toBeNull()
  })
})
