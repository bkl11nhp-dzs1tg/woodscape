import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useEditorStore } from '../../stores/editorStore'
import { useWorldStore } from '../../stores/worldStore'
import type { GeometryParams, Vec3, WorldObject } from '../../types/world'
import { executeCommand } from '../core/history'
import { patchCommand, roundMm } from './commands'
import { markGizmoInteraction, setGizmoDragging, snapValue } from './interaction'

const MIN_SIZE = 0.01
/** Face handles of a box: [axis, sign]. */
const FACES: [number, 1 | -1][] = [
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [2, 1],
  [2, -1],
]
const SIZE_KEYS = ['width', 'height', 'depth'] as const

function sizeKey(obj: WorldObject, axis: number): string {
  if (axis < 2) return SIZE_KEYS[axis]
  return obj.geometry.shape === 'panel' ? 'thickness' : 'depth'
}

function sizes(obj: WorldObject): Vec3 {
  const g = obj.geometry as unknown as Record<string, number>
  return [g.width, g.height, obj.geometry.shape === 'panel' ? g.thickness : g.depth]
}

/**
 * Small handles in the middle of each face of the selected box or panel. Drag one to push or pull that face
 * while the opposite face stays put. The change previews live and becomes one undo step on release.
 */
export function ResizeHandles() {
  const editing = useEditorStore((s) => s.appMode === 'edit')
  const tool = useEditorStore((s) => s.activeTool)
  const id = useEditorStore((s) => (s.selectedIds.length === 1 ? s.selectedIds[0] : null))
  const obj = useWorldStore((s) => (id ? s.objects[id] : undefined))
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const group = useRef<THREE.Group>(null)
  const drag = useRef<{ original: WorldObject; axis: number; sign: 1 | -1; normal: THREE.Vector3; origin: THREE.Vector3; start: number } | null>(null)
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 14, 10), [])
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd36b', depthTest: false, transparent: true, opacity: 0.95 }), [])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  const show = editing && (tool === 'select' || tool === 'move') && obj && !obj.locked && (obj.geometry.shape === 'box' || obj.geometry.shape === 'panel')

  // Keep the handles a steady size on screen.
  useFrame(() => {
    if (!group.current || !show) return
    group.current.children.forEach((child) => {
      const distance = camera.position.distanceTo(child.getWorldPosition(new THREE.Vector3()))
      child.scale.setScalar(Math.max(0.05, distance * 0.012))
    })
  })

  /** Parameter along the line origin + normal * t that lies closest to the pointer's ray. */
  const along = (event: PointerEvent, origin: THREE.Vector3, normal: THREE.Vector3): number => {
    const rect = gl.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
    const ray = new THREE.Raycaster()
    ray.setFromCamera(ndc, camera)
    const w = origin.clone().sub(ray.ray.origin)
    const b = normal.dot(ray.ray.direction)
    const d = normal.dot(w)
    const e = ray.ray.direction.dot(w)
    const denominator = 1 - b * b
    if (Math.abs(denominator) < 1e-4) return 0
    return (b * e - d) / denominator
  }

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const state = drag.current
      if (!state) return
      const editor = useEditorStore.getState()
      let delta = along(event, state.origin, state.normal) - state.start
      if (editor.snapEnabled) delta = snapValue(delta, editor.gridStep)
      const current = sizes(state.original)[state.axis]
      const next = Math.max(MIN_SIZE, current + delta)
      const applied = next - current
      const shift = state.normal.clone().multiplyScalar(applied / 2)
      const [x, y, z] = state.original.transform.position
      const updated: WorldObject = {
        ...state.original,
        geometry: { ...state.original.geometry, [sizeKey(state.original, state.axis)]: roundMm(next) } as GeometryParams,
        transform: { ...state.original.transform, position: [roundMm(x + shift.x), roundMm(y + shift.y), roundMm(z + shift.z)] },
      }
      useWorldStore.getState().applyPatch({ [updated.id]: updated })
    }
    const onUp = () => {
      const state = drag.current
      if (!state) return
      drag.current = null
      setGizmoDragging(false)
      markGizmoInteraction()
      const after = useWorldStore.getState().objects[state.original.id]
      if (!after || JSON.stringify(after) === JSON.stringify(state.original)) return
      // Put the original back, then record the change as one undoable command.
      useWorldStore.getState().applyPatch({ [state.original.id]: state.original })
      executeCommand(patchCommand('ResizeObject', { [state.original.id]: state.original }, { [state.original.id]: after }))
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, gl])

  if (!show || !obj) return null
  const size = sizes(obj)
  const rotation = new THREE.Euler(...obj.transform.rotation)
  const centre = new THREE.Vector3(...obj.transform.position)

  const begin = (axis: number, sign: 1 | -1) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    const normal = new THREE.Vector3(axis === 0 ? sign : 0, axis === 1 ? sign : 0, axis === 2 ? sign : 0).applyEuler(rotation)
    const origin = centre.clone().addScaledVector(normal, size[axis] / 2)
    drag.current = { original: obj, axis, sign, normal, origin, start: along(event.nativeEvent, origin, normal) }
    setGizmoDragging(true)
  }

  return (
    <group ref={group}>
      {FACES.map(([axis, sign]) => {
        const normal = new THREE.Vector3(axis === 0 ? sign : 0, axis === 1 ? sign : 0, axis === 2 ? sign : 0).applyEuler(rotation)
        const position = centre.clone().addScaledVector(normal, size[axis] / 2)
        return (
          <mesh key={`${axis}${sign}`} geometry={geometry} material={material} position={position} renderOrder={15} onPointerDown={begin(axis, sign)} />
        )
      })}
    </group>
  )
}
