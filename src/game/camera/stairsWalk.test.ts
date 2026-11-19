import { Vector3 } from 'three'
import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from '../../stores/editorStore'
import { useWorldStore } from '../../stores/worldStore'
import { buildHouse } from '../building/houseBuilder'
import { HOUSE_PLANS } from '../building/housePlans'
import { getWallHoles } from '../building/openings'
import { clearHistory } from '../core/history'
import { getTerrainHeight } from '../environment/terrain'
import { resolveCameraCollision } from './collision'
import { EYE_HEIGHT, groundHeightAt, stepVertical } from './walking'

const instant = async () => undefined

beforeEach(() => {
  useWorldStore.setState({ objects: {}, order: [] })
  useEditorStore.setState({ selectedIds: [] })
  clearHistory()
})

const slabTop = (name: string) => {
  const slab = Object.values(useWorldStore.getState().objects).find((o) => o.name === name)!
  return slab.transform.position[1] + (slab.geometry as { height: number }).height / 2
}

/** One frame of walking as the game does it: collide, find the floor, settle. */
function walkTo(position: Vector3, fall: { v: number }, x: number, z: number): void {
  const objects = useWorldStore.getState().objects
  const list = Object.values(objects)
  const holes = getWallHoles(objects)
  position.x = x
  position.z = z
  for (let tick = 0; tick < 3; tick++) {
    resolveCameraCollision(position, 0.3, list, holes)
    const waist = position.clone()
    waist.y -= 0.85
    const before = waist.clone()
    resolveCameraCollision(waist, 0.3, list, holes)
    position.x += waist.x - before.x
    position.z += waist.z - before.z
    const support = groundHeightAt(position.x, position.z, position.y, list)
    const floorEye = Math.max(getTerrainHeight(position.x, position.z), support ?? -Infinity) + EYE_HEIGHT
    const result = stepVertical(position.y, fall.v, floorEye, 1 / 90, false)
    position.y = result.y
    fall.v = result.vy
  }
}

describe('standing and stepping', () => {
  it('stands on a floor, steps up a low rise, and falls off a ledge', () => {
    const floor = (id: string, x: number, top: number) => ({
      id,
      type: 'floor_slab',
      name: id,
      materialId: 'plain_white',
      geometry: { shape: 'box' as const, width: 2, height: 0.2, depth: 4 },
      transform: { position: [x, top - 0.1, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
      locked: false,
    })
    const objects = [floor('low', 0, 1), floor('step', 2, 1.3), floor('tall', 4, 3)]
    expect(groundHeightAt(0, 0, 1 + EYE_HEIGHT, objects)).toBeCloseTo(1)
    expect(groundHeightAt(2, 0, 1 + EYE_HEIGHT, objects)).toBeCloseTo(1.3)
    // a 2 m wall of floor is not something you step onto
    expect(groundHeightAt(4, 0, 1 + EYE_HEIGHT, objects)).toBeNull()
    let state = { y: 5, vy: 0, grounded: false }
    for (let i = 0; i < 200; i++) state = stepVertical(state.y, state.vy, 1 + EYE_HEIGHT, 1 / 60, false)
    expect(state.y).toBeCloseTo(1 + EYE_HEIGHT, 2)
    expect(state.grounded).toBe(true)
    const jumped = stepVertical(state.y, 0, 1 + EYE_HEIGHT, 1 / 60, true)
    expect(jumped.y).toBeGreaterThan(state.y)
  })
})

describe('climbing the stairs of the ready-made houses', () => {
  const tall = HOUSE_PLANS.filter((plan) => plan.stairs && plan.stairs.length > 0)
  it('there are tall houses to test', () => expect(tall.length).toBeGreaterThanOrEqual(3))

  it.each(tall.map((plan) => plan.id))('%s: every flight can be walked up from one floor to the next', async (id) => {
    await buildHouse(id, [0, 0], 0, instant)
    const plan = HOUSE_PLANS.find((p) => p.id === id)!
    plan.stairs!.forEach((flight, f) => {
      const from = slabTop(`Sàn tầng ${f + 1}`)
      const to = slabTop(`Sàn tầng ${f + 2}`)
      const position = new Vector3(flight.x, from + EYE_HEIGHT, flight.z - 0.9)
      const fall = { v: 0 }
      let z = position.z
      const end = flight.z + 5.3 + 0.8
      let highest = position.y
      for (; z < end; z += 0.03) {
        walkTo(position, fall, flight.x, z)
        highest = Math.max(highest, position.y)
      }
      expect(position.y, `${id} flight ${f + 1} ends on the next floor`).toBeCloseTo(to + EYE_HEIGHT, 1)
      expect(Math.abs(position.x - flight.x), `${id} flight ${f + 1} stays on the stairs`).toBeLessThan(0.2)
      expect(highest).toBeLessThan(to + EYE_HEIGHT + 0.3)
    })
  })
})
