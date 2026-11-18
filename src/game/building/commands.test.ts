import { beforeEach, describe, expect, it } from 'vitest'
import { createObjectFromPreset, getShapePreset } from '../../data/shapePresets'
import { useEditorStore } from '../../stores/editorStore'
import { useWorldStore } from '../../stores/worldStore'
import { clearHistory, redo, undo } from '../core/history'
import {
  addObject,
  cutObject,
  deleteObjects,
  duplicateObject,
  duplicateObjects,
  groupObjects,
  moveObject,
  paintObjects,
  resizeObject,
  setFaceMaterial,
  setObjectMaterial,
  setPaint,
  transformObjects,
  ungroupObjects,
} from './commands'
import { createGeometry } from '../geometry/GeometryFactory'
import { cutAlongLine, cutOutShape, shapePoints, splitPolygon } from './cutting'
import { resolveFaceMaterialIds } from './faceMaterials'
import { snapValue } from './interaction'
import { clickSelect, connectedRegion, groupMembers } from './selection'
import { snapOffset, worldAabb } from './snapping'

const objects = () => useWorldStore.getState().objects

function addBeam(id = 'test_beam') {
  addObject(createObjectFromPreset(getShapePreset('preset_beam')!, id, [1, 2, 3]))
  return id
}

beforeEach(() => {
  useWorldStore.setState({ objects: {}, order: [] })
  useEditorStore.setState({ selectedIds: [] })
  clearHistory()
})

describe('commands and history', () => {
  it('adds an object and undoes / redoes it', () => {
    const id = addBeam()
    expect(useWorldStore.getState().order).toEqual([id])
    undo()
    expect(objects()[id]).toBeUndefined()
    expect(useWorldStore.getState().order).toEqual([])
    redo()
    expect(objects()[id].geometry).toEqual({ shape: 'box', width: 0.15, height: 0.1, depth: 2.4 })
  })

  it('moves with millimeter rounding and restores the old position on undo', () => {
    const id = addBeam()
    moveObject(id, [1.23456, 2, 3])
    expect(objects()[id].transform.position).toEqual([1.235, 2, 3])
    undo()
    expect(objects()[id].transform.position).toEqual([1, 2, 3])
  })

  it('keeps the base in place when an upright object gets taller', () => {
    const id = addBeam()
    resizeObject(id, { shape: 'box', width: 0.15, height: 0.5, depth: 2.4 })
    const obj = objects()[id]
    expect(obj.geometry).toMatchObject({ height: 0.5 })
    // The bottom was at 2 - 0.05 = 1.95 and must stay there.
    expect(obj.transform.position[1] - 0.25).toBeCloseTo(1.95)
  })

  it('assigns one face independently and resets faces with a whole-object material', () => {
    const id = addBeam()
    setFaceMaterial(id, 'top', 'brick_red_painted')
    expect(resolveFaceMaterialIds(objects()[id])).toEqual([
      'pine_painted',
      'pine_painted',
      'brick_red_painted',
      'pine_painted',
      'pine_endgrain_painted',
      'pine_endgrain_painted',
    ])
    setObjectMaterial(id, 'oak_painted')
    expect(resolveFaceMaterialIds(objects()[id])).toEqual(Array(6).fill('oak_painted'))
    undo()
    undo()
    expect(objects()[id].faceMaterials).toEqual({ front: 'pine_endgrain_painted', back: 'pine_endgrain_painted' })
  })

  it('duplicates as an independent object and deleting clears the selection', () => {
    const id = addBeam()
    const copyId = duplicateObject(id)!
    expect(copyId).not.toBe(id)
    expect(objects()[copyId].transform.position[0]).toBeGreaterThan(1)
    moveObject(copyId, [9, 9, 9])
    expect(objects()[id].transform.position).toEqual([1, 2, 3])

    useEditorStore.setState({ selectedIds: [copyId] })
    deleteObjects([copyId])
    expect(objects()[copyId]).toBeUndefined()
    expect(useEditorStore.getState().selectedIds).toEqual([])
    undo()
    expect(objects()[copyId].transform.position).toEqual([9, 9, 9])
  })

  it('does not record a history step when nothing changes', () => {
    const id = addBeam()
    moveObject(id, [1, 2, 3])
    undo()
    expect(objects()[id]).toBeUndefined()
  })
})

describe('cutting and painting', () => {
  it('splits a beam in two pieces that fill exactly the same space', () => {
    const id = addBeam()
    setPaint(id, { color: '#ff0000', strength: 0.5 })
    const [a, b] = cutObject(id, 'z', 0.25)!
    expect(objects()[id]).toBeUndefined()
    expect(objects()[a].geometry).toMatchObject({ depth: 0.6 })
    expect(objects()[b].geometry).toMatchObject({ depth: 1.8 })
    // original spanned z 1.8 .. 4.2 around z = 3
    expect(objects()[a].transform.position[2]).toBeCloseTo(2.1)
    expect(objects()[b].transform.position[2]).toBeCloseTo(3.3)
    expect(objects()[b].paint).toEqual({ color: '#ff0000', strength: 0.5 })
    undo()
    expect(objects()[id].geometry).toMatchObject({ depth: 2.4 })
    expect(objects()[a]).toBeUndefined()
  })

  it('follows the rotation of the object being cut', () => {
    const id = addBeam()
    // Turn the beam a quarter turn about Y: its length now runs along world X.
    useWorldStore.getState().applyPatch({
      [id]: { ...objects()[id], transform: { position: [1, 2, 3], rotation: [0, Math.PI / 2, 0] } },
    })
    const [a, b] = cutObject(id, 'z', 0.5)!
    expect(objects()[a].transform.position[0]).toBeCloseTo(0.4)
    expect(objects()[b].transform.position[0]).toBeCloseTo(1.6)
  })

  it('refuses to cut shapes it cannot split', () => {
    addObject(createObjectFromPreset(getShapePreset('preset_sphere')!, 'ball', [0, 0, 0]))
    expect(cutObject('ball', 'x', 0.5)).toBeNull()
  })
})

describe('smart snapping', () => {
  const block = (x: number, y = 0.25) => worldAabb({ shape: 'box', width: 0.5, height: 0.5, depth: 0.5 }, [x, y, 0], [0, 0, 0])

  it('pulls a block flush against a neighbour that is almost touching', () => {
    // neighbour occupies x 0..0.5; the moving block starts 6 cm away from it
    const offset = snapOffset(block(0.81), [block(0.25)])
    expect(offset[0]).toBeCloseTo(-0.06)
    expect(offset[1]).toBeCloseTo(0)
  })

  it('leaves distant objects alone', () => {
    expect(snapOffset(block(3), [block(0.25)])).toEqual([0, 0, 0])
  })

  it('accounts for rotation when measuring an object', () => {
    const turned = worldAabb({ shape: 'box', width: 2, height: 0.2, depth: 0.4 }, [0, 0, 0], [0, Math.PI / 2, 0])
    expect(turned.max[0]).toBeCloseTo(0.2)
    expect(turned.max[2]).toBeCloseTo(1)
  })
})

describe('free-form cutting', () => {
  const area = (points: [number, number][]) =>
    Math.abs(points.reduce((sum, p, i) => sum + p[0] * points[(i + 1) % points.length][1] - points[(i + 1) % points.length][0] * p[1], 0)) / 2

  it('splits an outline along a slanted line without losing any area', () => {
    const square: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    const [left, right] = splitPolygon(square, [-1, -0.5], [1, 0.5])!
    expect(area(left) + area(right)).toBeCloseTo(4)
    expect(area(left)).toBeCloseTo(2)
    expect(splitPolygon(square, [5, 5], [6, 5])).toBeNull()
  })

  it('cuts a panel along a drawn line into two pieces that stay where the panel was', () => {
    addObject(createObjectFromPreset(getShapePreset('preset_panel')!, 'sheet', [0, 1, 0]))
    // Diagonal across the 1 m x 1 m face (the face looks along Z).
    const [a, b] = cutAlongLine('sheet', 2, [-0.5, -0.5], [0.5, 0.5])!
    expect(objects().sheet).toBeUndefined()
    for (const id of [a, b]) {
      const g = objects()[id].geometry
      expect(g.shape).toBe('extrude')
      if (g.shape === 'extrude') {
        expect(g.points).toHaveLength(3)
        expect(area(g.points)).toBeCloseTo(0.5)
        expect(g.depth).toBe(0.03)
      }
      // A triangle's bounding box is the whole square, so both centers sit on the panel's center.
      expect(objects()[id].transform.position).toEqual([0, 1, 0])
    }
    undo()
    expect(objects().sheet.geometry.shape).toBe('panel')
  })

  it('cuts a round hole out and can keep the removed disc', () => {
    addObject(createObjectFromPreset(getShapePreset('preset_panel')!, 'sheet', [0, 1, 0]))
    const [plate, plug] = cutOutShape('sheet', 2, shapePoints('circle', [0.2, 0.1], 0.3, 0.3), true)!
    const g = objects()[plate].geometry
    expect(g.shape === 'extrude' && g.holes?.length).toBe(1)
    expect(objects()[plug].transform.position[0]).toBeCloseTo(0.2)
    expect(objects()[plug].transform.position[1]).toBeCloseTo(1.1)
    // Real geometry: the hole leaves the plate with less front surface than a full square.
    const mesh = createGeometry(g)
    expect(mesh.getAttribute('position').count).toBeGreaterThan(36)
  })

  it('cuts through a beam from the side face, following the beam own axes', () => {
    const id = addBeam() // 0.15 x 0.10 x 2.4 at [1, 2, 3]
    // Side face (looking along X): plane U runs along -Z, V along Y. Cut straight down at the middle.
    const pieces = cutAlongLine(id, 0, [0, -1], [0, 1])!
    const zs = pieces.map((piece) => objects()[piece].transform.position[2]).sort()
    expect(zs[0]).toBeCloseTo(2.4)
    expect(zs[1]).toBeCloseTo(3.6)
  })
})

describe('groups and moving several objects', () => {
  it('moves a group as one undoable step and keeps the parts independent objects', () => {
    const a = addBeam('a')
    const b = addBeam('b')
    const groupId = groupObjects([a, b])
    expect(objects()[a].groupId).toBe(groupId)
    expect(groupMembers(a).sort()).toEqual(['a', 'b'])

    clickSelect(a, { add: false, single: false })
    expect(useEditorStore.getState().selectedIds.sort()).toEqual(['a', 'b'])
    clickSelect(a, { add: false, single: true })
    expect(useEditorStore.getState().selectedIds).toEqual(['a'])

    transformObjects([
      { id: a, position: [5, 2, 3], rotation: [0, 0, 0] },
      { id: b, position: [6, 2, 3], rotation: [0, 0, 0] },
    ])
    expect(objects()[b].transform.position[0]).toBe(6)
    undo()
    expect(objects()[a].transform.position[0]).toBe(1)
    expect(objects()[b].transform.position[0]).toBe(1)

    ungroupObjects([a, b])
    expect(objects()[a].groupId).toBeUndefined()
  })

  it('duplicates a selection into a separate group', () => {
    const a = addBeam('a')
    const b = addBeam('b')
    groupObjects([a, b])
    const copies = duplicateObjects([a, b])
    expect(copies).toHaveLength(2)
    expect(objects()[copies[0]].groupId).toBe(objects()[copies[1]].groupId)
    expect(objects()[copies[0]].groupId).not.toBe(objects()[a].groupId)
  })

  it('finds the connected area for whole-area painting', () => {
    addBeam('a')
    addBeam('b')
    moveObject('b', [1.2, 2, 3]) // right beside a
    addBeam('far')
    moveObject('far', [30, 2, 3])
    expect(connectedRegion('a').sort()).toEqual(['a', 'b'])
    paintObjects(connectedRegion('a'), { color: '#00ff00', strength: 1 })
    expect(objects().b.paint?.color).toBe('#00ff00')
    expect(objects().far.paint).toBeUndefined()
  })
})

describe('snapping', () => {
  it('rounds to the nearest grid step', () => {
    expect(snapValue(1.26, 0.1)).toBeCloseTo(1.3)
    expect(snapValue(1.12, 0.25)).toBeCloseTo(1)
    expect(snapValue(-0.37, 0.5)).toBeCloseTo(-0.5)
  })
})
