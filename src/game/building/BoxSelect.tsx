import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import { useEditorStore } from '../../stores/editorStore'
import { useWorldStore } from '../../stores/worldStore'
import { gizmoRecentlyUsed } from './interaction'
import { groupMembers } from './selection'

const DRAG_START = 6

/**
 * Hold Shift and drag across the scene to draw a box; everything whose middle falls inside it is added to
 * the selection (whole groups at a time). Works in the select, move and rotate tools of edit mode.
 */
export function BoxSelect() {
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    const element = gl.domElement
    let start: { x: number; y: number } | null = null
    let frame: HTMLDivElement | null = null
    let dragging = false

    const allowed = () => {
      const editor = useEditorStore.getState()
      return editor.appMode === 'edit' && (editor.activeTool === 'select' || editor.activeTool === 'move' || editor.activeTool === 'rotate')
    }
    const clear = () => {
      frame?.remove()
      frame = null
      start = null
      dragging = false
    }
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || !e.shiftKey || !allowed() || gizmoRecentlyUsed()) return
      start = { x: e.clientX, y: e.clientY }
    }
    const onMove = (e: PointerEvent) => {
      if (!start) return
      if (!dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) < DRAG_START) return
      dragging = true
      if (!frame) {
        frame = document.createElement('div')
        frame.className = 'box-select'
        document.body.appendChild(frame)
      }
      frame.style.left = `${Math.min(start.x, e.clientX)}px`
      frame.style.top = `${Math.min(start.y, e.clientY)}px`
      frame.style.width = `${Math.abs(e.clientX - start.x)}px`
      frame.style.height = `${Math.abs(e.clientY - start.y)}px`
    }
    const onUp = (e: PointerEvent) => {
      if (!start) return
      const wasDragging = dragging
      const first = start
      clear()
      if (!wasDragging) return
      const bounds = element.getBoundingClientRect()
      const x0 = Math.min(first.x, e.clientX)
      const x1 = Math.max(first.x, e.clientX)
      const y0 = Math.min(first.y, e.clientY)
      const y1 = Math.max(first.y, e.clientY)
      const picked = new Set<string>(useEditorStore.getState().selectedIds)
      const point = new THREE.Vector3()
      for (const obj of Object.values(useWorldStore.getState().objects)) {
        if (obj.locked) continue
        point.set(...obj.transform.position).project(camera)
        if (point.z < -1 || point.z > 1) continue
        const sx = bounds.left + ((point.x + 1) / 2) * bounds.width
        const sy = bounds.top + ((1 - point.y) / 2) * bounds.height
        if (sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1) for (const id of groupMembers(obj.id)) picked.add(id)
      }
      useEditorStore.setState({ selectedIds: [...picked] })
    }
    // Capture phase: while a box is being drawn the camera must not also turn.
    const swallow = (e: PointerEvent) => {
      if (e.button === 0 && e.shiftKey && allowed() && !gizmoRecentlyUsed()) {
        onDown(e)
        e.stopImmediatePropagation()
      }
    }
    element.addEventListener('pointerdown', swallow, true)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      element.removeEventListener('pointerdown', swallow, true)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      clear()
    }
  }, [gl, camera])

  return null
}
