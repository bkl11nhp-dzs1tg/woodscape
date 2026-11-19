import { create } from 'zustand'
import { registerPreset, unregisterPreset } from '../data/shapePresets'
import { clusterPreset, type ClusterTemplate } from '../game/building/clusters'

/** Saved groups the player can place again. Plain data, kept in localStorage. */
const KEY = 'woodscape.templates.v1'

function load(): ClusterTemplate[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((t) => t && Array.isArray(t.parts) && Array.isArray(t.size)) : []
  } catch {
    return []
  }
}

function persist(templates: ClusterTemplate[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(templates))
    return true
  } catch {
    return false
  }
}

interface TemplateState {
  templates: ClusterTemplate[]
  /** False when the browser refused to store it (the template still works until the page closes). */
  add: (template: ClusterTemplate) => boolean
  remove: (id: string) => void
}

const initial = load()
initial.forEach((template) => registerPreset(clusterPreset(template, 'Mẫu của tôi')))

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: initial,
  add: (template) => {
    const templates = [...get().templates, template]
    registerPreset(clusterPreset(template, 'Mẫu của tôi'))
    set({ templates })
    return persist(templates)
  },
  remove: (id) => {
    const templates = get().templates.filter((template) => template.id !== id)
    unregisterPreset(`preset_cluster_${id}`)
    set({ templates })
    persist(templates)
  },
}))
