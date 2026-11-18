import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useEditorStore } from '../../stores/editorStore'
import { useWorldStore } from '../../stores/worldStore'
import { getTerrainHeight } from '../environment/terrain'
import { paintObjects } from './commands'
import { setGizmoDragging } from './interaction'
import { connectedRegion } from './selection'

/** Mouse pointer for the paint tool: a round brush filled with the current color. */
function brushCursor(color: string, erase: boolean): string {
  const fill = erase ? 'none' : color
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34">` +
    `<circle cx="17" cy="17" r="12" fill="${fill}" fill-opacity="0.85" stroke="#23201b" stroke-width="3"/>` +
    `<circle cx="17" cy="17" r="12" fill="none" stroke="#ffffff" stroke-width="1.5"/>` +
    (erase ? `<path d="M9 9l16 16M25 9L9 25" stroke="#ffffff" stroke-width="2"/>` : '') +
    `</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 17 17, crosshair`
}

/**
 * Paint tool: press and sweep the brush across objects to coat each one it
 * touches; with "whole area" on, a touch coats every connected part of the
 * same kind (all walls of a house, a whole roof).
 */
export function PaintBrush() {
  const active = useEditorStore((s) => s.activeTool === 'paint')
  const color = useEditorStore((s) => s.paintColor)
  const erase = useEditorStore((s) => s.paintErase)
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    if (!active) return
    const element = gl.domElement
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let stroke: Set<string> | null = null

    const objectAt = (e: PointerEvent): string | null => {
      const rect = element.getBoundingClientRect()
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const group = scene.getObjectByName('world-objects')
      const hit = group ? raycaster.intersectObjects(group.children, true)[0] : undefined
      const objects = useWorldStore.getState().objects
      for (let node: THREE.Object3D | null = hit?.object ?? null; node; node = node.parent) {
        if (objects[node.name]) return node.name
      }
      return null
    }
    const apply = (e: PointerEvent) => {
      const id = objectAt(e)
      if (!stroke || !id || stroke.has(id)) return
      const editor = useEditorStore.getState()
      const ids = editor.paintRegion ? connectedRegion(id) : [id]
      paintObjects(ids, editor.paintErase ? undefined : { color: editor.paintColor, strength: editor.paintStrength })
      ids.forEach((painted) => stroke?.add(painted))
    }
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      stroke = new Set()
      // Holds the camera still while the brush is down.
      setGizmoDragging(true)
      apply(e)
    }
    const onMove = (e: PointerEvent) => apply(e)
    const onUp = () => {
      if (!stroke) return
      stroke = null
      setGizmoDragging(false)
    }
    element.addEventListener('pointerdown', onDown)
    element.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    element.style.cursor = brushCursor(color, erase)
    return () => {
      onUp()
      element.removeEventListener('pointerdown', onDown)
      element.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      element.style.cursor = ''
    }
  }, [active, color, erase, gl, camera, scene])

  return null
}

/** The map marker as a beam of light in the world, so you can see which way to go. */
export function WaypointBeacon() {
  const waypoint = useEditorStore((s) => s.waypoint)
  const beam = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (beam.current) (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.45 + 0.2 * Math.sin(clock.elapsedTime * 3)
  })
  if (!waypoint) return null
  const ground = Math.max(getTerrainHeight(waypoint.x, waypoint.z), 0)
  return (
    <group position={[waypoint.x, ground, waypoint.z]}>
      <mesh ref={beam} position-y={30} raycast={() => null}>
        <cylinderGeometry args={[0.18, 0.18, 60, 10, 1, true]} />
        <meshBasicMaterial color="#ffd36b" transparent opacity={0.5} depthWrite={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.08} raycast={() => null}>
        <ringGeometry args={[0.7, 1, 28]} />
        <meshBasicMaterial color="#ffd36b" transparent opacity={0.9} depthWrite={false} />
      </mesh>
    </group>
  )
}
