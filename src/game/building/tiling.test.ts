import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from '../../stores/editorStore'
import { useWorldStore } from '../../stores/worldStore'
import type { WorldObject } from '../../types/world'
import { clearHistory, undo } from '../core/history'
import { addObject, renameGroup, groupObjects } from './commands'
import { planTiles } from './tiling'
import { fillAreaWithTiles } from './tilingActions'

const base = { tileU: 0.3, tileV: 0.3, gap: 0, pattern: 'grid' as const, cutToFit: true }

describe('planTiles', () => {
  it('covers an exact multiple with whole pieces', () => {
    const plan = planTiles({ ...base, areaU: 1.2, areaV: 0.9 })
    expect(plan.slots).toHaveLength(12)
    expect(plan.cutCount).toBe(0)
  })

  it('cuts the last column and row to end on the edge', () => {
    const plan = planTiles({ ...base, areaU: 1, areaV: 0.4 })
    expect(plan.slots).toHaveLength(8)
    const last = plan.slots.find((s) => s.sizeU < 0.29 && s.sizeV > 0.29)!
    expect(last.sizeU).toBeCloseTo(0.1)
    expect(Math.max(...plan.slots.map((s) => s.u + s.sizeU / 2))).toBeCloseTo(1)
  })

  it('lays only whole pieces when cutting is off', () => {
    const plan = planTiles({ ...base, areaU: 1, areaV: 0.4, cutToFit: false })
    expect(plan.slots).toHaveLength(3)
    expect(plan.cutCount).toBe(0)
  })

  it('leaves the joint gap between pieces', () => {
    const plan = planTiles({ ...base, areaU: 0.62, areaV: 0.3, gap: 0.02 })
    const us = plan.slots.map((s) => s.u).sort((a, b) => a - b)
    expect(us[1] - us[0]).toBeCloseTo(0.32)
  })

  it('slides every second row by half a piece in bond pattern, staying inside the area', () => {
    const plan = planTiles({ ...base, areaU: 0.9, areaV: 0.6, pattern: 'bond' })
    for (const slot of plan.slots) {
      expect(slot.u - slot.sizeU / 2).toBeGreaterThanOrEqual(-1e-9)
      expect(slot.u + slot.sizeU / 2).toBeLessThanOrEqual(0.9 + 1e-9)
    }
    const secondRow = plan.slots.filter((s) => s.v > 0.3)
    expect(Math.min(...secondRow.map((s) => s.u - s.sizeU / 2))).toBeCloseTo(0)
    expect(secondRow.some((s) => s.sizeU < 0.3 - 1e-9)).toBe(true)
  })
})

describe('fillAreaWithTiles', () => {
  beforeEach(() => {
    useWorldStore.setState({ objects: {}, order: [] })
    useEditorStore.setState({ selectedIds: [] })
    clearHistory()
  })

  function plank(rotationY = 0): WorldObject {
    return {
      id: 'plank',
      type: 'wood_plank',
      name: 'Ván sàn',
      materialId: 'oak',
      geometry: { shape: 'box', width: 0.2, height: 0.02, depth: 1 },
      transform: { position: [5, 0.01, 5], rotation: [0, rotationY, 0] },
      locked: false,
    }
  }

  it('replaces the piece with a named group and undoes in one step', () => {
    addObject(plank())
    const ids = fillAreaWithTiles('plank', { areaU: 1, areaV: 3, gap: 0, pattern: 'grid', cutToFit: true, groupName: 'Sàn bếp' })
    const objects = useWorldStore.getState().objects
    expect(ids).toHaveLength(15)
    expect(objects.plank).toBeUndefined()
    expect(new Set(ids.map((id) => objects[id].groupName))).toEqual(new Set(['Sàn bếp']))
    expect(new Set(ids.map((id) => objects[id].groupId)).size).toBe(1)
    // 5 columns of 0.2 m along X starting at the original centre
    const xs = ids.map((id) => objects[id].transform.position[0])
    expect(Math.min(...xs)).toBeCloseTo(5)
    expect(Math.max(...xs)).toBeCloseTo(5.8)
    undo()
    expect(Object.keys(useWorldStore.getState().objects)).toEqual(['plank'])
  })

  it('follows the rotation of the original piece', () => {
    addObject(plank(Math.PI / 2))
    const ids = fillAreaWithTiles('plank', { areaU: 0.4, areaV: 1, gap: 0, pattern: 'grid', cutToFit: true, groupName: '' })
    const objects = useWorldStore.getState().objects
    const zs = ids.map((id) => objects[id].transform.position[2])
    // local X turned a quarter turn about Y points along world -Z
    expect(Math.min(...zs)).toBeCloseTo(4.8)
    expect(Math.max(...zs)).toBeCloseTo(5)
  })

  it('names a group and renames it', () => {
    addObject({ ...plank(), id: 'a' })
    addObject({ ...plank(), id: 'b' })
    groupObjects(['a', 'b'], '  Sàn  ')
    expect(useWorldStore.getState().objects.a.groupName).toBe('Sàn')
    renameGroup(['a', 'b'], 'Sàn gỗ')
    expect(useWorldStore.getState().objects.b.groupName).toBe('Sàn gỗ')
  })
})
