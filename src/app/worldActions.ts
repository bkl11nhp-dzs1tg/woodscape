import { clearHistory } from '../game/core/history'
import { addSnapshot, type Snapshot } from '../services/saveService'
import { useEditorStore } from '../stores/editorStore'
import { showToast } from '../stores/toastStore'
import { createDemoWorld, getWorldData, useWorldStore } from '../stores/worldStore'

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
