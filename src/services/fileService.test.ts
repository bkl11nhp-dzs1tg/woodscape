import { describe, expect, it } from 'vitest'
import { exportWorldJson, fileNameFor, parseWorldJson } from './fileService'
import { SCHEMA_VERSION, type WorldData } from './saveService'

const world: WorldData = {
  schemaVersion: SCHEMA_VERSION,
  worldName: 'Khu phố ven sông',
  objects: {
    a: { id: 'a', type: 'box', name: 'A', materialId: 'plain_white', geometry: { shape: 'box', width: 1, height: 1, depth: 1 }, transform: { position: [0, 0.5, 0], rotation: [0, 0, 0] }, locked: false },
  },
  order: ['a'],
}

describe('world files', () => {
  it('round-trips a world and its templates', () => {
    const template = { id: 't1', name: 'Mẫu', size: [1, 1, 1] as [number, number, number], parts: [] }
    const parsed = parseWorldJson(exportWorldJson(world, [template]))
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.world.order).toEqual(['a'])
      expect(parsed.world.objects.a.name).toBe('A')
      expect(parsed.templates).toHaveLength(1)
    }
  })

  it('refuses anything that is not a good world file, with a reason', () => {
    expect(parseWorldJson('not json')).toMatchObject({ ok: false })
    expect(parseWorldJson('{"hello":1}')).toMatchObject({ ok: false })
    const old = JSON.parse(exportWorldJson(world, []))
    old.schemaVersion = SCHEMA_VERSION - 3
    expect(parseWorldJson(JSON.stringify(old))).toMatchObject({ ok: false })
    const broken = JSON.parse(exportWorldJson(world, []))
    broken.order = ['missing']
    expect(parseWorldJson(JSON.stringify(broken))).toMatchObject({ ok: false })
  })

  it('makes a plain file name from a Vietnamese world name', () => {
    expect(fileNameFor('Khu phố ven sông')).toBe('woodscape-khu-pho-ven-song.json')
    expect(fileNameFor('')).toBe('woodscape-the-gioi.json')
  })
})
