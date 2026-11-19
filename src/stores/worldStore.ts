import { create } from 'zustand'
import { createShowcaseObjects } from '../data/showcaseObjects'
import { loadWorld, saveWorld, SCHEMA_VERSION, type WorldData } from '../services/saveService'
import type { WorldObject } from '../types/world'

/** A set of object writes: an object to add/replace, or null to remove. */
export type ObjectPatch = Record<string, WorldObject | null>

/** Canonical world state. Plain serializable data only — never Three.js objects. */
interface WorldState {
  worldName: string
  mapId: string
  objects: Record<string, WorldObject>
  order: string[]
  /** Low-level write. Editing code goes through commands so changes are undoable. */
  applyPatch: (patch: ObjectPatch) => void
  /** Replaces the whole world (restoring a snapshot, resetting to the demo). */
  replaceWorld: (data: WorldData) => void
}

export function createDemoWorld(): WorldData {
  const objects = createShowcaseObjects()
  return {
    schemaVersion: SCHEMA_VERSION,
    worldName: 'Khu phố ven sông',
    objects: Object.fromEntries(objects.map((o) => [o.id, o])),
    order: objects.map((o) => o.id),
  }
}

export function createEmptyWorld(): WorldData {
  return { schemaVersion: SCHEMA_VERSION, worldName: 'Đất trống', objects: {}, order: [] }
}

export function getWorldData(): WorldData {
  const { worldName, objects, order } = useWorldStore.getState()
  return { schemaVersion: SCHEMA_VERSION, worldName, objects, order }
}

const initial = loadWorld() ?? createDemoWorld()

export const useWorldStore = create<WorldState>((set) => ({
  worldName: initial.worldName,
  mapId: 'coastal_valley',
  objects: initial.objects,
  order: initial.order,
  applyPatch: (patch) =>
    set((state) => {
      const objects = { ...state.objects }
      let order = state.order
      for (const [id, value] of Object.entries(patch)) {
        if (value) {
          if (!(id in objects)) order = [...order, id]
          objects[id] = value
        } else if (id in objects) {
          delete objects[id]
          order = order.filter((other) => other !== id)
        }
      }
      return { objects, order }
    }),
  replaceWorld: (data) => set({ worldName: data.worldName, objects: data.objects, order: data.order }),
}))

// Auto-save shortly after every change.
let saveTimer: ReturnType<typeof setTimeout> | undefined
useWorldStore.subscribe(() => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveWorld(getWorldData()), 600)
})
