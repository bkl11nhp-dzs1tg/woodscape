import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { formatLength } from '../../services/units'
import { useEditorStore } from '../../stores/editorStore'
import type { WorldObject } from '../../types/world'
import { getTerrainHeight } from '../environment/terrain'
import { addObject, createObjectId, roundMm } from './commands'
import { forceStraight } from './drawing'
import { gizmoRecentlyUsed, snapToGrid, straightWanted } from './interaction'
import { raycastTerrain } from './PlacementSystem'

/**
 * Layout marking, as on a building site: click points on the ground to chalk
 * straight lines between them, each showing its length. A line is an ordinary
 * thin object, so it can be selected, moved, measured, deleted and undone.
 * Esc ends the chain.
 */

const LINE_WIDTH = 0.06
const LINE_HEIGHT = 0.012
const CLICK_DRAG_TOLERANCE = 5

export function MarkTool() {
  const active = useEditorStore((s) => s.activeTool === 'mark')
  const unit = useEditorStore((s) => s.unit)
  const gl = useThree((state) => state.gl)
  const start = useRef<THREE.Vector3 | null>(null)
  const cursor = useRef(new THREE.Vector3())
  const hasCursor = useRef(false)
  const dot = useRef<THREE.Mesh>(null)
  const line = useRef<THREE.Mesh>(null)
  const [length, setLength] = useState(0)

  useFrame(({ raycaster, pointer, camera }) => {
    if (!active) return
    raycaster.setFromCamera(pointer, camera)
    const hit = raycastTerrain(raycaster.ray)
    hasCursor.current = hit !== null
    if (!hit) return
    let x = snapToGrid(hit.point.x)
    let z = snapToGrid(hit.point.z)
    const origin = start.current
    if (origin && straightWanted()) {
      const { snapEnabled, gridStep } = useEditorStore.getState()
      ;[x, z] = forceStraight([origin.x, origin.z], [x, z], snapEnabled ? gridStep : 0)
    }
    cursor.current.set(x, getTerrainHeight(x, z) + 0.03, z)
    dot.current?.position.copy(cursor.current)

    const from = start.current
    if (line.current) {
      line.current.visible = from !== null
      if (from) {
        const distance = Math.hypot(x - from.x, z - from.z)
        line.current.position.set((x + from.x) / 2, (cursor.current.y + from.y) / 2, (z + from.z) / 2)
        line.current.rotation.y = Math.atan2(x - from.x, z - from.z)
        line.current.scale.set(LINE_WIDTH, LINE_HEIGHT, Math.max(distance, 0.001))
        if (Math.abs(distance - length) > 0.004) setLength(distance)
      }
    }
  })

  useEffect(() => {
    if (!active) {
      start.current = null
      return
    }
    const element = gl.domElement
    let down: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => {
      down = e.button === 0 ? { x: e.clientX, y: e.clientY } : null
    }
    const onUp = (e: PointerEvent) => {
      const pressed = down
      down = null
      if (!pressed || gizmoRecentlyUsed() || !hasCursor.current) return
      if (Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y) > CLICK_DRAG_TOLERANCE) return
      const point = cursor.current.clone()
      const from = start.current
      start.current = point
      if (!from) return
      const distance = Math.hypot(point.x - from.x, point.z - from.z)
      if (distance < 0.02) return
      const midX = (point.x + from.x) / 2
      const midZ = (point.z + from.z) / 2
      const mark: WorldObject = {
        id: createObjectId('mark_line'),
        type: 'mark_line',
        name: `Vạch dấu ${formatLength(distance, useEditorStore.getState().unit)}`,
        materialId: 'chalk_white',
        geometry: { shape: 'box', width: LINE_WIDTH, height: LINE_HEIGHT, depth: roundMm(distance) },
        transform: {
          position: [roundMm(midX), roundMm(getTerrainHeight(midX, midZ) + 0.02), roundMm(midZ)],
          rotation: [0, Math.atan2(point.x - from.x, point.z - from.z), 0],
        },
        locked: false,
      }
      addObject(mark)
    }
    element.addEventListener('pointerdown', onDown)
    element.addEventListener('pointerup', onUp)
    element.style.cursor = 'crosshair'
    return () => {
      element.removeEventListener('pointerdown', onDown)
      element.removeEventListener('pointerup', onUp)
      element.style.cursor = ''
    }
  }, [active, gl])

  if (!active) return null
  return (
    <>
      <mesh ref={dot} raycast={() => null} renderOrder={12}>
        <sphereGeometry args={[0.07, 12, 8]} />
        <meshBasicMaterial color="#ffd36b" depthTest={false} transparent />
      </mesh>
      <mesh ref={line} visible={false} raycast={() => null} renderOrder={11}>
        <boxGeometry />
        <meshBasicMaterial color="#ffffff" depthTest={false} transparent opacity={0.9} />
        {length > 0 && (
          <Html center zIndexRange={[5, 0]} className="dim-label" style={{ pointerEvents: 'none' }}>
            {formatLength(length, unit)}
          </Html>
        )}
      </mesh>
    </>
  )
}
