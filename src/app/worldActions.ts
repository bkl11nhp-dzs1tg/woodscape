import { forgetSavedSpot } from '../game/camera/savedSpot'
import { clearHistory } from '../game/core/history'
import { downloadText, pickTextFile } from '../services/download'
import { exportWorldJson, fileNameFor, parseWorldJson } from '../services/fileService'
import { addSnapshot, loadNewerWorld, type Snapshot } from '../services/saveService'
import { useTemplateStore } from '../stores/templateStore'
import { useEditorStore } from '../stores/editorStore'
import { showToast } from '../stores/toastStore'
import { createDemoWorld, createEmptyWorld, getWorldData, useWorldStore } from '../stores/worldStore'

/** Whole-world actions behind the "Mốc lưu" menu. */

function timeLabel(): string {
  return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

/** Keeps a copy of the world as it is now, to come back to later. */
export function captureSnapshot(name?: string): Snapshot[] {
  const list = addSnapshot(name ?? `Mốc lưu lúc ${timeLabel()}`, structuredClone(getWorldData()))
  showToast('Đã lưu mốc. Có thể quay về trạng thái này bất cứ lúc nào.')
  return list
}

function replace(data: ReturnType<typeof getWorldData>, message: string): Snapshot[] {
  // What is on screen now is kept first, so restoring can never lose work.
  const list = addSnapshot(`Tự lưu trước khi thay (${timeLabel()})`, structuredClone(getWorldData()))
  useEditorStore.setState({ selectedIds: [], activeTool: 'select', placingPresetId: null })
  useWorldStore.getState().replaceWorld(structuredClone(data))
  clearHistory()
  showToast(message)
  return list
}

export function restoreSnapshot(snapshot: Snapshot): Snapshot[] {
  return replace(snapshot.data, `Đã quay về "${snapshot.name}"`)
}

export function resetToDemo(): Snapshot[] {
  return replace(createDemoWorld(), 'Đã dựng lại khu phố mẫu')
}

/** Saves the world and the saved templates to a .json file. */
export function exportWorldToFile(): void {
  const data = getWorldData()
  downloadText(fileNameFor(data.worldName), exportWorldJson(data, useTemplateStore.getState().templates))
  showToast(`Đã xuất ${data.order.length} vật thể ra tệp.`)
}

/** Opens a .json file made by "Xuất ra tệp"; what is on screen is kept as a mark first. */
export async function importWorldFromFile(): Promise<Snapshot[] | null> {
  const text = await pickTextFile('.json,application/json')
  if (text === null) return null
  const parsed = parseWorldJson(text)
  if (!parsed.ok) {
    showToast(parsed.error)
    return null
  }
  const have = new Set(useTemplateStore.getState().templates.map((template) => template.id))
  for (const template of parsed.templates) if (!have.has(template.id)) useTemplateStore.getState().add(template)
  return replace(parsed.world, `Đã mở "${parsed.world.worldName}" (${parsed.world.order.length} vật thể).`)
}

/** At start-up: if IndexedDB holds a newer world than localStorage (the big one that did not fit), use it. */
export async function hydrateFromIndexedDb(): Promise<void> {
  const newer = await loadNewerWorld()
  if (!newer) return
  useWorldStore.getState().replaceWorld(structuredClone(newer))
  clearHistory()
  showToast('Đã nạp lại thế giới lưu gần nhất.')
}

/** Starts a fresh world from the home page. The one on screen is kept as a mark first. */
export function startWorld(kind: 'demo' | 'empty'): void {
  forgetSavedSpot()
  replace(kind === 'demo' ? createDemoWorld() : createEmptyWorld(), kind === 'demo' ? 'Đã dựng khu phố mẫu' : 'Đất trống, bắt đầu xây thôi')
}
