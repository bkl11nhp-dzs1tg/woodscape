import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { formatLength } from '../../services/units'
import { useEditorStore } from '../../stores/editorStore'
import { getTerrainHeight } from '../environment/terrain'
import { gizmoRecentlyUsed, snapToGrid } from './interaction'
import { raycastTerrain } from './PlacementSystem'
import { fillGroundRect } from './tilingActions'

const CLICK_DRAG_TOLERANCE = 6
const MIN_SIDE = 0.1

type Pt = [number, number]

/**
 * Fill tool: click two opposite corners on the ground and the chosen piece is
 * spread over that rectangle (settings come from the "Lát đầy" section of the
 * properties panel). The rectangle follows the pointer and shows its size.
 */
export function FillTool() {
  const active = useEditorStore((s) => s.activeTool === 'fill' && s.groundFill !== null)
  const corner = useEditorStore((s) => s.fillCorner)
  const unit = useEditorStore((s) => s.unit)
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const [cursor, setCursor] = useState<Pt | null>(null)

  useEffect(() => {
    if (!active) return
    const element = gl.domElement
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    let down: { x: number; y: number } | null = null

    const pointAt = (clientX: number, clientY: number): Pt | null => {
      const rect = element.getBoundingClientRect()
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const hit = raycastTerrain(ray.ray)
      return hit ? [snapToGrid(hit.point.x), snapToGrid(hit.point.z)] : null
    }
    const onMove = (e: PointerEvent) => {
      const point = pointAt(e.clientX, e.clientY)
      if (point) setCursor(point)
    }
    const onDown = (e: PointerEvent) => {
      down = e.button === 0 ? { x: e.clientX, y: e.clientY } : null
    }
    const onUp = (e: PointerEvent) => {
      const start = down
      down = null
      if (!start || gizmoRecentlyUsed()) return
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > CLICK_DRAG_TOLERANCE) return
      const point = pointAt(e.clientX, e.clientY)
      if (!point) return
      setCursor(point)
      const editor = useEditorStore.getState()
      const first = editor.fillCorner
      if (!first) {
        useEditorStore.setState({ fillCorner: point })
        return
      }
      const rect = { x0: Math.min(first[0], point[0]), x1: Math.max(first[0], point[0]), z0: Math.min(first[1], point[1]), z1: Math.max(first[1], point[1]) }
      if (rect.x1 - rect.x0 < MIN_SIDE || rect.z1 - rect.z0 < MIN_SIDE) return
      const settings = editor.groundFill
      if (!settings) return
      const ids = fillGroundRect(settings.sourceId, rect, settings)
      useEditorStore.setState({ fillCorner: null })
      // Done: back to selecting, with the new floor selected.
      if (ids.length > 0) useEditorStore.setState({ activeTool: 'select', groundFill: null })
    }
    element.addEventListener('pointermove', onMove)
    element.addEventListener('pointerdown', onDown)
    element.addEventListener('pointerup', onUp)
    element.style.cursor = 'crosshair'
    return () => {
      element.removeEventListener('pointermove', onMove)
      element.removeEventListener('pointerdown', onDown)
      element.removeEventListener('pointerup', onUp)
      element.style.cursor = ''
      useEditorStore.setState({ fillCorner: null })
    }
  }, [active, gl, camera])

  if (!active) return null
  const other = corner && cursor ? cursor : null
  const x0 = corner && other ? Math.min(corner[0], other[0]) : 0
  const x1 = corner && other ? Math.max(corner[0], other[0]) : 0
  const z0 = corner && other ? Math.min(corner[1], other[1]) : 0
  const z1 = corner && other ? Math.max(corner[1], other[1]) : 0
  const y = corner ? getTerrainHeight((x0 + x1) / 2, (z0 + z1) / 2) + 0.06 : 0
  return (
    <>
      {corner && (
        <mesh position={[corner[0], getTerrainHeight(corner[0], corner[1]) + 0.06, corner[1]]} raycast={() => null} renderOrder={12}>
          <sphereGeometry args={[0.12, 12, 8]} />
          <meshBasicMaterial color="#ff9a4d" depthTest={false} transparent />
        </mesh>
      )}
      {cursor && (
        <mesh position={[cursor[0], getTerrainHeight(cursor[0], cursor[1]) + 0.06, cursor[1]]} raycast={() => null} renderOrder={12}>
          <sphereGeometry args={[0.08, 12, 8]} />
          <meshBasicMaterial color="#ffffff" depthTest={false} transparent opacity={0.9} />
        </mesh>
      )}
      {corner && other && x1 > x0 && z1 > z0 && (
        <>
          <mesh position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} renderOrder={9}>
            <planeGeometry args={[x1 - x0, z1 - z0]} />
            <meshBasicMaterial color="#ffd36b" transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <Html position={[(x0 + x1) / 2, y + 0.4, (z0 + z1) / 2]} center zIndexRange={[5, 0]} className="dim-label" style={{ pointerEvents: 'none' }}>
            {formatLength(x1 - x0, unit)} × {formatLength(z1 - z0, unit)}
          </Html>
        </>
      )}
    </>
  )
}
