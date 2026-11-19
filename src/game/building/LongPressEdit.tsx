import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import { useEditorStore } from '../../stores/editorStore'
import { showToast } from '../../stores/toastStore'
import { useWorldStore } from '../../stores/worldStore'
import { isGizmoDragging, markGizmoInteraction, objectIdFromHit } from './interaction'
import { groupMembers } from './selection'

const HOLD_MS = 480
const MOVE_TOLERANCE = 10

/**
 * On a touch screen (no keyboard, no right-click) pressing and holding a finger
 * on an object is how you pick it to edit: from view mode it switches to edit
 * mode with that object selected. Dragging, or a second finger, cancels it, so
 * looking around never selects anything by accident.
 */
export function LongPressEdit() {
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    const element = gl.domElement
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let timer: ReturnType<typeof setTimeout> | undefined
    let start: { x: number; y: number } | null = null

    const clear = () => {
      clearTimeout(timer)
      start = null
    }

    const objectAt = (x: number, y: number): string | null => {
      const rect = element.getBoundingClientRect()
      pointer.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const group = scene.getObjectByName('world-objects')
      const hit = group ? raycaster.intersectObjects(group.children, true)[0] : undefined
      const objects = useWorldStore.getState().objects
      return objectIdFromHit(hit, objects)
    }

    const fire = () => {
      const point = start
      start = null
      if (!point || isGizmoDragging()) return
      const id = objectAt(point.x, point.y)
      const object = id ? useWorldStore.getState().objects[id] : undefined
      if (!id || !object || object.locked) return
      const editor = useEditorStore.getState()
      if (editor.appMode === 'view') editor.setAppMode('edit')
      useEditorStore.setState({ activeTool: 'select', selectedIds: groupMembers(id) })
      // The lift of the finger must not count as a tap that selects or deselects something else.
      markGizmoInteraction()
      navigator.vibrate?.(25)
      showToast(`Đang sửa "${object.name}". Kéo mũi tên để di chuyển.`)
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return
      // A second finger, or a tool that uses taps for something else, cancels it.
      if (start) return clear()
      const editor = useEditorStore.getState()
      if (editor.appMode === 'edit' && !['select', 'move', 'rotate'].includes(editor.activeTool)) return
      start = { x: e.clientX, y: e.clientY }
      timer = setTimeout(fire, HOLD_MS)
    }
    const onMove = (e: PointerEvent) => {
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_TOLERANCE) clear()
    }
    element.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', clear)
    window.addEventListener('pointercancel', clear)
    return () => {
      clear()
      element.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', clear)
      window.removeEventListener('pointercancel', clear)
    }
  }, [gl, camera, scene])

  return null
}
