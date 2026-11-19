import type { ClusterTemplate } from '../game/building/clusters'
import { isWorldData, SCHEMA_VERSION, type WorldData } from './saveService'

/** The world and the saved templates as one JSON file the player can keep, send or open on another machine. */
export interface WorldFile {
  format: 'woodscape-world'
  schemaVersion: number
  exportedAt: string
  worldName: string
  objects: WorldData['objects']
  order: string[]
  templates: ClusterTemplate[]
}

export function exportWorldJson(data: WorldData, templates: ClusterTemplate[]): string {
  const file: WorldFile = {
    format: 'woodscape-world',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    worldName: data.worldName,
    objects: data.objects,
    order: data.order,
    templates,
  }
  return JSON.stringify(file)
}

export type ParsedFile = { ok: true; world: WorldData; templates: ClusterTemplate[] } | { ok: false; error: string }

/** Reads a file made by `exportWorldJson` and checks it before anything touches the game. */
export function parseWorldJson(text: string): ParsedFile {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Tệp không đọc được (không phải JSON).' }
  }
  const file = value as Partial<WorldFile> | null
  if (!file || typeof file !== 'object' || file.format !== 'woodscape-world') return { ok: false, error: 'Đây không phải tệp thế giới của WOODSCAPE.' }
  if (file.schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, error: `Tệp thuộc phiên bản dữ liệu ${file.schemaVersion ?? '?'}, game đang dùng ${SCHEMA_VERSION}. Hãy mở bằng đúng bản đã xuất.` }
  }
  const world: WorldData = { schemaVersion: SCHEMA_VERSION, worldName: String(file.worldName ?? 'Thế giới nhập vào'), objects: file.objects ?? {}, order: file.order ?? [] }
  if (!isWorldData(world)) return { ok: false, error: 'Tệp bị hỏng hoặc thiếu vật thể.' }
  const templates = Array.isArray(file.templates) ? file.templates.filter((t) => t && Array.isArray(t.parts) && Array.isArray(t.size) && typeof t.id === 'string') : []
  return { ok: true, world, templates }
}

export function fileNameFor(worldName: string): string {
  const slug = worldName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `woodscape-${slug || 'the-gioi'}.json`
}
