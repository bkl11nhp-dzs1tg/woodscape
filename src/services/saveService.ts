import type { WorldObject } from '../types/world'

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

function isWorldData(value: unknown): value is WorldData {
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

export function saveWorld(data: WorldData): boolean {
  return write(WORLD_KEY, data)
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
  const list = [snapshot, ...listSnapshots()].slice(0, MAX_SNAPSHOTS)
  write(SNAPSHOT_KEY, list)
  return list
}

export function removeSnapshot(id: string): Snapshot[] {
  const list = listSnapshots().filter((snapshot) => snapshot.id !== id)
  write(SNAPSHOT_KEY, list)
  return list
}
