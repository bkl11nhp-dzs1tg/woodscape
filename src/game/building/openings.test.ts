import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { createShowcaseObjects } from '../../data/showcaseObjects'
import type { GeometryParams, Vec3, WorldObject } from '../../types/world'
import { resolveCameraCollision } from '../camera/collision'
import { createBoxWithHoles, createExtrudeWithOpenings } from '../geometry/GeometryFactory'
import { cutOutShape, shapePoints } from './cutting'
import { useWorldStore } from '../../stores/worldStore'
import { computeWallHoles } from './openings'

function make(id: string, geometry: GeometryParams, position: Vec3, rotation: Vec3 = [0, 0, 0], open = false): WorldObject {
  return { id, type: id, name: id, materialId: 'pine_painted', geometry, transform: { position, rotation }, locked: false, open }
}

// A 4 m wide, 2.6 m tall wall standing on y = 0, facing +Z.
const wall = make('wall', { shape: 'box', width: 4, height: 2.6, depth: 0.22 }, [0, 1.3, 0])
const door = (open = false, x = 0.6) =>
  make('door', { shape: 'door', width: 0.9, height: 2.05, thickness: 0.14, hinge: 'left' }, [x, 1.025, 0], [0, 0, 0], open)

describe('wall openings', () => {
  it('cuts a hole the size of a door frame set into the wall', () => {
    const holes = computeWallHoles([wall, door()])
    expect(holes.wall.thin).toBe('z')
    expect(holes.wall.rects).toEqual([{ u0: 0.15, u1: 1.05, v0: -1.3, v1: 0.75 }])
  })

  it('ignores openings that are not in the wall or stand across it', () => {
    const away = make('w1', { shape: 'window', width: 1, height: 1, thickness: 0.14 }, [0, 1.3, 2])
    const across = make('w2', { shape: 'window', width: 1, height: 1, thickness: 0.14 }, [0, 1.3, 0], [0, Math.PI / 2, 0])
    expect(computeWallHoles([wall, away, across])).toEqual({})
  })

  it('follows a wall whose thin axis is X and that is turned', () => {
    const side = make('side', { shape: 'box', width: 0.22, height: 2.4, depth: 4.56 }, [5, 1.2, 3])
    const pane = make('pane', { shape: 'window', width: 1.8, height: 1, thickness: 0.14 }, [5, 1.4, 3], [0, Math.PI / 2, 0])
    const holes = computeWallHoles([side, pane])
    expect(holes.side.thin).toBe('x')
    expect(holes.side.rects).toEqual([{ u0: -0.9, u1: 0.9, v0: -0.3, v1: 0.7 }])
  })

  it('gives every door, window and opening of the demo neighbourhood a hole in some wall', () => {
    const objects = createShowcaseObjects()
    const openings = objects.filter((obj) => ['door', 'window', 'opening'].includes(obj.geometry.shape))
    const holes = computeWallHoles(objects)
    const rects = Object.values(holes).reduce((sum, wall) => sum + wall.rects.length, 0)
    expect(openings.length).toBeGreaterThan(30)
    expect(rects).toBeGreaterThanOrEqual(openings.length)
    // IDs must be unique, or objects would overwrite each other in the store.
    expect(new Set(objects.map((obj) => obj.id)).size).toBe(objects.length)
  })
})

describe('box with holes', () => {
  const holes = computeWallHoles([wall, door()]).wall
  const geometry = createBoxWithHoles(4, 2.6, 0.22, false, holes)

  it('keeps the outer size and leaves the opening empty', () => {
    geometry.computeBoundingBox()
    const size = geometry.boundingBox!.max.clone().sub(geometry.boundingBox!.min)
    expect([size.x, size.y, size.z].map((v) => Number(v.toFixed(4)))).toEqual([4, 2.6, 0.22])

    // No front or back surface may cover the hole: every such triangle's center lies outside it.
    const position = geometry.getAttribute('position')
    const normal = geometry.getAttribute('normal')
    for (let i = 0; i < position.count; i += 3) {
      if (Math.abs(normal.getZ(i)) < 0.5) continue
      const cx = (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3
      const cy = (position.getY(i) + position.getY(i + 1) + position.getY(i + 2)) / 3
      expect(cx > 0.15 && cx < 1.05 && cy > -1.3 && cy < 0.75).toBe(false)
    }
  })

  it('adds reveal surfaces inside the opening, sorted into the six face groups', () => {
    const position = geometry.getAttribute('position')
    const normal = geometry.getAttribute('normal')
    // A reveal on the hinge side of the door faces +X at x = 0.15.
    let found = false
    for (let i = 0; i < position.count; i++) {
      if (Math.abs(position.getX(i) - 0.15) < 1e-4 && normal.getX(i) > 0.9) found = true
    }
    expect(found).toBe(true)
    expect(geometry.groups.map((g) => g.materialIndex)).toEqual([0, 1, 2, 3, 4, 5])
    expect(geometry.groups.reduce((sum, g) => sum + g.count, 0)).toBe(position.count)
  })
})

describe('camera collision', () => {
  const resolve = (objects: WorldObject[], from: Vec3) => {
    const position = new THREE.Vector3(...from)
    resolveCameraCollision(position, 0.3, objects, computeWallHoles(objects))
    return position
  }

  it('pushes the eye back out of a solid wall', () => {
    const eye = resolve([wall], [-1, 1.6, 0.2])
    expect(eye.z).toBeCloseTo(0.11 + 0.3)
    expect(eye.x).toBeCloseTo(-1)
  })

  it('blocks a closed door and lets an open one through', () => {
    expect(resolve([wall, door(false)], [0.6, 1.6, 0.05]).z).toBeGreaterThan(0.3)
    const through = resolve([wall, door(true)], [0.6, 1.6, 0.05])
    expect(through.toArray()).toEqual([0.6, 1.6, 0.05])
  })

  it('leaves the eye alone when it is clear of everything', () => {
    expect(resolve([wall, door()], [0, 1.6, 2]).toArray()).toEqual([0, 1.6, 2])
  })
})

describe('a wall that has been cut', () => {
  it('keeps the holes of its door after a shape is cut out of it', () => {
    useWorldStore.setState({ objects: { wall }, order: ['wall'] })
    // A round hole well away from the door.
    const ids = cutOutShape('wall', 2, shapePoints('circle', [-1.2, 0], 0.8, 0.8), false)
    expect(ids).not.toBeNull()
    const cut = useWorldStore.getState().objects[ids![0]]
    expect(cut.geometry.shape).toBe('extrude')
    const holes = computeWallHoles([cut, door()])
    expect(holes[cut.id]?.rects).toHaveLength(1)
    const g = cut.geometry as Extract<GeometryParams, { shape: 'extrude' }>
    const plain = createExtrudeWithOpenings(g.points, g.holes ?? [], g.depth, [])
    const withDoor = createExtrudeWithOpenings(g.points, g.holes ?? [], g.depth, holes[cut.id].rects)
    // The door opening adds side faces to the wall.
    expect(withDoor.attributes.position.count).toBeGreaterThan(plain.attributes.position.count)
  })
})
