import { useEffect } from 'react'
import { finishDrawing } from '../game/building/drawActions'
import { deleteObjects, duplicateObjects, groupObjects, transformObjects, ungroupObjects } from '../game/building/commands'
import { cameraState } from '../game/camera/cameraState'
import { useWorldStore } from '../stores/worldStore'
import { redo, undo } from '../game/core/history'
import { useEditorStore } from '../stores/editorStore'

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function duplicateSelection(): void {
  const copies = duplicateObjects(useEditorStore.getState().selectedIds)
  if (copies.length > 0) useEditorStore.setState({ selectedIds: copies, activeTool: 'move', placingPresetId: null })
}

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
}

/**
 * Arrow keys push the selected object one grid step along the world axis that
 * best matches the direction on screen (up = away from you). With Shift, the
 * up/down arrows raise and lower it.
 */
function nudgeSelection(code: string, vertical: boolean): boolean {
  const editor = useEditorStore.getState()
  const objects = useWorldStore.getState().objects
  const selected = editor.selectedIds.map((id) => objects[id]).filter(Boolean)
  const arrow = ARROWS[code]
  if (selected.length === 0 || !arrow) return false
  const step = editor.snapEnabled ? editor.gridStep : 0.05
  const shift = (dx: number, dy: number, dz: number) =>
    transformObjects(
      selected.map((obj) => {
        const [x, y, z] = obj.transform.position
        return { id: obj.id, position: [x + dx, y + dy, z + dz], rotation: obj.transform.rotation }
      }),
    )
  if (vertical && arrow[1] !== 0) {
    shift(0, arrow[1] * step, 0)
    return true
  }
  // Camera heading as forward / right vectors on the ground, snapped to the nearest world axis.
  const forward: [number, number] = [-Math.sin(cameraState.yaw), -Math.cos(cameraState.yaw)]
  const right: [number, number] = [-forward[1], forward[0]]
  const wanted = [right[0] * arrow[0] + forward[0] * arrow[1], right[1] * arrow[0] + forward[1] * arrow[1]]
  const alongX = Math.abs(wanted[0]) >= Math.abs(wanted[1])
  const dx = alongX ? Math.sign(wanted[0]) * step : 0
  const dz = alongX ? 0 : Math.sign(wanted[1]) * step
  shift(dx, 0, dz)
  return true
}

/** Editor keyboard shortcuts. Camera keys (WASD, Q/E, F, Esc) live in CameraController. */
export function useShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      const editor = useEditorStore.getState()
      if (editor.appMode !== 'edit') return
      if (editor.activeTool === 'draw' && !e.ctrlKey && !e.metaKey) {
        if (e.code === 'Enter') {
          e.preventDefault()
          finishDrawing(e.shiftKey)
          return
        }
        if (e.code === 'Backspace' || e.code === 'Delete') {
          e.preventDefault()
          editor.setDrawPoints(editor.drawPoints.slice(0, -1))
          return
        }
      }
      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.code === 'KeyZ') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (ctrl && e.code === 'KeyY') {
        e.preventDefault()
        redo()
      } else if (ctrl && e.code === 'KeyG') {
        e.preventDefault()
        if (e.shiftKey) ungroupObjects(editor.selectedIds)
        else if (editor.selectedIds.length > 1) groupObjects(editor.selectedIds)
      } else if (ctrl && e.code === 'KeyD') {
        e.preventDefault()
        duplicateSelection()
      } else if (ctrl || e.altKey) {
        return
      } else if (e.code in ARROWS) {
        if (nudgeSelection(e.code, e.shiftKey)) e.preventDefault()
      } else if (e.code === 'KeyV') editor.setTool('select')
      else if (e.code === 'KeyM') editor.setTool('move')
      else if (e.code === 'KeyR') {
        if (editor.activeTool === 'place') editor.rotatePlacement(e.shiftKey ? -Math.PI / 4 : Math.PI / 4)
        else editor.setTool('rotate')
      }
      else if (e.code === 'KeyK') editor.setTool('cut')
      else if (e.code === 'KeyB') editor.setTool('paint')
      else if (e.code === 'KeyL') editor.setTool('mark')
      else if (e.code === 'KeyT') editor.setTool('draw')
      else if (e.code === 'Delete' || e.code === 'Backspace') deleteObjects(editor.selectedIds)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
