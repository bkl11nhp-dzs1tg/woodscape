import { Vector3 } from 'three'
import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from '../../stores/editorStore'
import { useWorldStore } from '../../stores/worldStore'
import { clearHistory } from '../core/history'
import { buildHouse } from '../building/houseBuilder'
import { getWallHoles } from '../building/openings'
import { HOUSE_PLANS } from '../building/housePlans'
import { resolveCameraCollision } from './collision'

const instant = async () => undefined

beforeEach(() => {
  useWorldStore.setState({ objects: {}, order: [] })
  useEditorStore.setState({ selectedIds: [] })
  clearHistory()
})

/**
 * Walks an eye-height point straight through a door, the way the camera moves, starting 1 m in front of it.
 * `direction` picks which side to start from. Returns null when the start itself is not standing room
 * (a very small room), a number when the walk was blocked at that distance, and 'ok' when it got through.
 */
function walkThrough(doorId: string, offset: number, direction: 1 | -1): number | null | 'ok' {
  const objects = useWorldStore.getState().objects
  const door = objects[doorId]
  const g = door.geometry as { height: number }
  const yaw = door.transform.rotation[1]
  const normal = new Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(direction)
  const side = new Vector3(normal.z, 0, -normal.x)
  const [dx, dy, dz] = door.transform.position
  const eye = dy - g.height / 2 + 1.7
  const origin = new Vector3(dx, eye, dz).addScaledVector(side, offset)
  const position = origin.clone().addScaledVector(normal, 1)
  const holes = getWallHoles(objects)
  const all = Object.values(objects)
  const start = position.clone()
  resolveCameraCollision(position, 0.3, all, holes)
  if (position.distanceTo(start) > 0.02) return null
  for (let step = 0; step <= 40; step++) {
    position.addScaledVector(normal, -0.05)
    resolveCameraCollision(position, 0.3, all, holes)
    const along = position.clone().sub(origin).dot(normal)
    const across = position.clone().sub(origin).addScaledVector(normal, -along)
    if (across.length() > 0.15) return 1 - step * 0.05
  }
  // It must really have come out the other side of the door.
  const finished = position.clone().sub(origin).dot(normal)
  return finished > -0.4 ? 1 + finished : 'ok'
}

describe('walking through doorways', () => {
  it.each(HOUSE_PLANS.map((plan) => plan.id))('%s: every door can be walked through when open', async (id) => {
    await buildHouse(id, [0, 0], 0, instant)
    const doors = Object.values(useWorldStore.getState().objects).filter((o) => o.type === 'door')
    expect(doors.length).toBeGreaterThan(0)
    const failures: string[] = []
    for (const door of doors) {
      useWorldStore.getState().applyPatch({ [door.id]: { ...door, open: true } })
      // Straight down the middle, and a little to either side (a person does not aim perfectly), from either side.
      let testable = 0
      for (const offset of [0, -0.25, 0.25]) {
        for (const direction of [1, -1] as const) {
          const result = walkThrough(door.id, offset, direction)
          if (result === null) continue
          testable++
          if (result !== 'ok') failures.push(`${door.name} (${(door.geometry as { width: number }).width} m, ${offset} m off centre, from ${direction > 0 ? 'front' : 'back'}) blocked at ${result.toFixed(2)} m`)
        }
      }
      if (testable === 0) failures.push(`${door.name} has no standing room on either side`)
    }
    expect(failures).toEqual([])
  })
})
