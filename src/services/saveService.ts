import type { WorldObject } from '../types/world'
import { idbGet, idbSet } from './indexedDb'

/**
 * Local persistence: the current world is auto-saved, and the player can keep
 * named snapshots ("mốc lưu") to return to after breaking something.
 * Stored in localStorage as plain versioned JSON.
 */

export const SCHEMA_VERSION = 12
const WORLD_KEY = `woodscape.world.v${SCHEMA_VERSION}`
const SNAPSHOT_KEY = `woodscape.snapshots.v${SCHEMA_VERSION}`
const MAX_SNAPSHOTS = 12

export interface WorldData {
  schemaVersion: number
  worldName: string
  objects: Record<string, WorldObject>
  order: string[]
}

export interface Snapshot {
  id: string
  name: string
  createdAt: number
  objectCount: number
  data: WorldData
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function isWorldData(value: unknown): value is WorldData {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<WorldData>
  if (data.schemaVersion !== SCHEMA_VERSION || !Array.isArray(data.order) || !data.objects) return false
  return data.order.every((id) => {
    const obj = data.objects?.[id]
    return Boolean(obj && obj.id === id && obj.geometry && typeof obj.geometry.shape === 'string' && obj.transform)
  })
}

function read<T>(key: string): T | null {
  try {
    const raw = storage()?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): boolean {
  try {
    storage()?.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function loadWorld(): WorldData | null {
  const data = read<unknown>(WORLD_KEY)
  if (isWorldData(data)) return data
  archiveLegacyWorld()
  return null
}

/**
 * A world saved by the previous version is not thrown away when the format
 * moves on: it is kept as a snapshot the player can return to.
 */
function archiveLegacyWorld(): void {
  const legacyKey = `woodscape.world.v${SCHEMA_VERSION - 1}`
  const legacy = read<WorldData>(legacyKey)
  if (!legacy || !legacy.objects || !Array.isArray(legacy.order)) return
  addSnapshot('Thế giới trước bản cập nhật', { ...legacy, schemaVersion: SCHEMA_VERSION })
  try {
    storage()?.removeItem(legacyKey)
  } catch {
    // Nothing to do: the snapshot already holds the data.
  }
}

const SAVED_AT_KEY = `${WORLD_KEY}.at`
const IDB_WORLD = 'world'

/**
 * Saves to localStorage (fast, read at start-up) and mirrors to IndexedDB (room for a big world). When the
 * browser refuses the localStorage write because the world is too big, IndexedDB still has it.
 */
export function saveWorld(data: WorldData): boolean {
  const savedAt = Date.now()
  void idbSet(IDB_WORLD, { savedAt, data })
  const ok = write(WORLD_KEY, data)
  if (ok) write(SAVED_AT_KEY, savedAt)
  return ok
}

/** The newest world IndexedDB holds, if it is newer than what localStorage gave at start-up. */
export async function loadNewerWorld(): Promise<WorldData | null> {
  const record = await idbGet<{ savedAt: number; data: unknown }>(IDB_WORLD)
  if (!record || !isWorldData(record.data)) return null
  const local = read<number>(SAVED_AT_KEY) ?? 0
  return record.savedAt > local + 1000 ? record.data : null
}

export function listSnapshots(): Snapshot[] {
  const list = read<Snapshot[]>(SNAPSHOT_KEY)
  return Array.isArray(list) ? list.filter((snapshot) => isWorldData(snapshot.data)) : []
}

/** Adds a snapshot (newest first) and returns the updated list. */
export function addSnapshot(name: string, data: WorldData): Snapshot[] {
  const snapshot: Snapshot = {
    id: `snap_${Date.now().toString(36)}`,
    name,
    createdAt: Date.now(),
    objectCount: data.order.length,
    data,
  }
  let list = [snapshot, ...listSnapshots()].slice(0, MAX_SNAPSHOTS)
  // A big world can fill the browser's quota: drop the oldest marks until the new one fits.
  while (!write(SNAPSHOT_KEY, list) && list.length > 1) list = list.slice(0, -1)
  return list
}

export function removeSnapshot(id: string): Snapshot[] {
  const list = listSnapshots().filter((snapshot) => snapshot.id !== id)
  write(SNAPSHOT_KEY, list)
  return list
}
