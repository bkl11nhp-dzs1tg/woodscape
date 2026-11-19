import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from '../../stores/editorStore'
import { useWorldStore } from '../../stores/worldStore'
import type { WorldObject } from '../../types/world'
import { clearHistory, undo } from '../core/history'
import { addObject } from './commands'
import { findGuides, unionAabb } from './guides'
import { measure } from './measure'
import { coverRoundWithTiles } from './tilingActions'

beforeEach(() => {
  useWorldStore.setState({ objects: {}, order: [] })
  useEditorStore.setState({ selectedIds: [] })
  clearHistory()
})

describe('alignment guides', () => {
  const box = (x0: number, x1: number, z0 = 0, z1 = 1) => ({ min: [x0, 0, z0] as [number, number, number], max: [x1, 1, z1] as [number, number, number] })

  it('finds a shared face within the tolerance and links the two pieces', () => {
    const guides = findGuides(box(2.03, 3), [box(0, 2)])
    const x = guides.find((g) => g.axis === 0)!
    expect(x.value).toBeCloseTo(2)
    expect(x.kind).toBe('edge')
    expect(x.from[2]).toBeCloseTo(x.to[2])
  })

  it('stays quiet when nothing lines up or the piece is far away', () => {
    expect(findGuides(box(5, 6, 0, 1), [box(0, 2, 40, 41)])).toHaveLength(0)
    expect(findGuides(box(2.5, 3.5, 0.3, 0.8), [box(0, 2)]).filter((g) => g.axis === 0)).toHaveLength(0)
  })

  it('lines up middles as well as faces', () => {
    const guides = findGuides(box(0.5, 1.5, 4, 5), [box(0, 2, 0, 1)])
    expect(guides.some((g) => g.axis === 0 && g.kind === 'centre')).toBe(true)
  })

  it('unions boxes', () => {
    const all = unionAabb([box(0, 1), box(3, 4)])
    expect(all.min[0]).toBe(0)
    expect(all.max[0]).toBe(4)
  })
})

describe('measure', () => {
  it('gives distance, level run, rise and the angle at the middle point', () => {
    const two = measure([[0, 0, 0], [3, 4, 0]])
    expect(two.length).toBeCloseTo(5)
    expect(two.horizontal).toBeCloseTo(3)
    expect(two.rise).toBeCloseTo(4)
    expect(measure([[1, 0, 0], [0, 0, 0], [0, 0, 1]]).angle).toBeCloseTo(90)
    expect(measure([[1, 0, 0], [0, 0, 0], [-1, 0, 0]]).angle).toBeCloseTo(180)
  })
})

describe('cladding round things', () => {
  it('wraps a cylinder in rings of pieces that sit just outside its surface', () => {
    const column: WorldObject = {
      id: 'col',
      type: 'primitive_cylinder',
      name: 'Cột',
      materialId: 'plain_white',
      geometry: { shape: 'cylinder', radius: 0.5, height: 1 },
      transform: { position: [10, 0.5, 20], rotation: [0, 0, 0] },
      locked: false,
    }
    addObject(column)
    const ids = coverRoundWithTiles('col', 'preset_brick', { gap: 0.004, groupName: 'Ốp cột' })
    expect(ids.length).toBeGreaterThan(40)
    const objects = useWorldStore.getState().objects
    for (const id of ids) {
      const [x, y, z] = objects[id].transform.position
      const away = Math.hypot(x - 10, z - 20)
      expect(away).toBeGreaterThan(0.5)
      expect(away).toBeLessThan(0.5 + 0.12)
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThan(1)
    }
    undo()
    expect(Object.keys(useWorldStore.getState().objects)).toEqual(['col'])
  })

  it('shrinks the rings toward the tip of a cone', () => {
    addObject({
      id: 'cone',
      type: 'primitive_cone',
      name: 'Nón',
      materialId: 'plain_white',
      geometry: { shape: 'cone', radius: 1, height: 2 },
      transform: { position: [0, 1, 0], rotation: [0, 0, 0] },
      locked: false,
    })
    const ids = coverRoundWithTiles('cone', 'preset_shingle', { gap: 0.004, groupName: '' })
    const objects = useWorldStore.getState().objects
    const reach = (limit: (y: number) => boolean) => Math.max(...ids.filter((id) => limit(objects[id].transform.position[1])).map((id) => Math.hypot(objects[id].transform.position[0], objects[id].transform.position[2])))
    expect(reach((y) => y < 0.7)).toBeGreaterThan(reach((y) => y > 1.6))
  })
})
