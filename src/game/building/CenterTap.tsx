import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import { useEditorStore } from '../../stores/editorStore'
import { showToast } from '../../stores/toastStore'
import { useWorldStore } from '../../stores/worldStore'
import { cameraCommands } from '../camera/cameraCommands'
import { toggleOpen } from './commands'
import { objectIdFromHit } from './interaction'
import { clickSelect } from './selection'

/**
 * The big action button of the on-screen controls: it acts on whatever the middle of the screen points at,
 * like a click. In view mode it opens or closes a door or window; in edit mode it selects the piece.
 */
export function CenterTap() {
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)

  useEffect(
    () =>
      cameraCommands.subscribe((command) => {
        if (command.type !== 'tap') return
        const editor = useEditorStore.getState()
        const ray = new THREE.Raycaster()
        ray.setFromCamera(new THREE.Vector2(0, 0), camera)
        ray.far = 12
        const group = scene.getObjectByName('world-objects')
        const objects = useWorldStore.getState().objects
        const id = group ? objectIdFromHit(ray.intersectObjects(group.children, true).find((hit) => hit.object.visible), objects) : null
        const target = id ? objects[id] : undefined

        if (editor.appMode === 'view') {
          if (target && (target.geometry.shape === 'door' || target.geometry.shape === 'window')) toggleOpen(target.id)
          else showToast('Hướng chấm giữa màn hình vào một cánh cửa rồi bấm Chạm.')
          return
        }
        if (editor.activeTool !== 'select' && editor.activeTool !== 'move' && editor.activeTool !== 'rotate') {
          showToast('Công cụ này dùng bằng cách chạm lên màn hình.')
          return
        }
        if (!target) {
          editor.select(null)
          return
        }
        clickSelect(target.id, { add: editor.multiSelect, single: false })
      }),
    [camera, scene],
  )
  return null
}
