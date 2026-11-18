import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { formatLength } from '../../services/units'
import { useEditorStore } from '../../stores/editorStore'
import { getTerrainHeight } from '../environment/terrain'
import { getGeometry } from '../geometry/GeometryFactory'
import { finishDrawing } from './drawActions'
import { buildDrawnParts, forceStraight, snapDirection, type Pt } from './drawing'
import { gizmoRecentlyUsed, snapToGrid, straightWanted } from './interaction'
import { raycastTerrain } from './PlacementSystem'

const CLICK_DRAG_TOLERANCE = 6
/** A click this close (meters) to the last point ends an open line; close to the first one, it closes the loop. */
const END_RADIUS = 0.35

/**
 * Draw tool: click points on the ground to lay a wall, fence or path along
 * them, as in a drawing program. Points snap to the grid and to straight and
 * 45° directions; the real parts are previewed while you go. Click the last
 * point again (or press Enter / "Xong") to finish; click the first point to
 * close a room.
 */
export function DrawTool() {
  const active = useEditorStore((s) => s.activeTool === 'draw')
  const points = useEditorStore((s) => s.drawPoints)
  const kind = useEditorStore((s) => s.drawKind)
  const styles = useEditorStore((s) => s.drawStyles)
  const unit = useEditorStore((s) => s.unit)
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const [cursor, setCursor] = useState<Pt | null>(null)
  const cursorRef = useRef<Pt | null>(null)

  /** Where a pointer ray would put the next point: on the grid, nudged straight, or onto the first point to close. */
  const pointFromRay = (raycaster: THREE.Raycaster): Pt | null => {
    const hit = raycastTerrain(raycaster.ray)
    if (!hit) return null
    const editor = useEditorStore.getState()
    const pts = editor.drawPoints
    let point: Pt = [snapToGrid(hit.point.x), snapToGrid(hit.point.z)]
    const last = pts[pts.length - 1]
    if (last) {
      const step = editor.snapEnabled ? editor.gridStep : 0
      point = straightWanted() ? forceStraight(last, point, step) : snapDirection(last, point, step)
      const first = pts[0]
      if (pts.length >= 3 && Math.hypot(hit.point.x - first[0], hit.point.z - first[1]) < END_RADIUS) point = first
    }
    return point
  }

  // The preview follows the pointer.
  useFrame(({ raycaster, pointer, camera }) => {
    if (!active) return
    raycaster.setFromCamera(pointer, camera)
    const point = pointFromRay(raycaster)
    if (!point) return
    const before = cursorRef.current
    if (!before || Math.hypot(before[0] - point[0], before[1] - point[1]) > 0.001) {
      cursorRef.current = point
      setCursor(point)
    }
  })

  useEffect(() => {
    if (!active) return
    const element = gl.domElement
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    let down: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => {
      down = e.button === 0 ? { x: e.clientX, y: e.clientY } : null
    }
    const onUp = (e: PointerEvent) => {
      const start = down
      down = null
      if (!start || gizmoRecentlyUsed()) return
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > CLICK_DRAG_TOLERANCE) return
      // A finger has no hover, so the point comes from where the tap landed.
      const rect = element.getBoundingClientRect()
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const point = pointFromRay(ray)
      if (!point) return
      cursorRef.current = point
      setCursor(point)
      const pts = useEditorStore.getState().drawPoints
      const last = pts[pts.length - 1]
      if (last && pts.length >= 2 && Math.hypot(point[0] - last[0], point[1] - last[1]) < END_RADIUS) {
        finishDrawing(false)
        return
      }
      if (pts.length >= 3 && Math.hypot(point[0] - pts[0][0], point[1] - pts[0][1]) < 0.01) {
        finishDrawing(true)
        return
      }
      if (last && Math.hypot(point[0] - last[0], point[1] - last[1]) < 0.05) return
      useEditorStore.setState({ drawPoints: [...pts, point] })
    }
    element.addEventListener('pointerdown', onDown)
    element.addEventListener('pointerup', onUp)
    element.style.cursor = 'crosshair'
    return () => {
      element.removeEventListener('pointerdown', onDown)
      element.removeEventListener('pointerup', onUp)
      element.style.cursor = ''
      // Leaving the tool throws away a line that was never finished.
      useEditorStore.setState({ drawPoints: [] })
    }
  }, [active, gl, camera])

  const preview = useMemo(() => {
    if (!active || points.length === 0 || !cursor) return []
    const path = Math.hypot(cursor[0] - points[points.length - 1][0], cursor[1] - points[points.length - 1][1]) < 0.05 ? points : [...points, cursor]
    return buildDrawnParts(path, false, styles[kind], getTerrainHeight)
  }, [active, points, cursor, styles, kind])

  if (!active) return null
  const last = points[points.length - 1]
  const label = last && cursor ? Math.hypot(cursor[0] - last[0], cursor[1] - last[1]) : 0
  return (
    <>
      {preview.map((part, i) => (
        <mesh key={i} geometry={getGeometry(part.geometry)} position={part.position} rotation={part.rotation} raycast={() => null} renderOrder={9}>
          <meshBasicMaterial color="#ffd36b" transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
      {points.map((p, i) => (
        <mesh key={i} position={[p[0], getTerrainHeight(p[0], p[1]) + 0.05, p[1]]} raycast={() => null} renderOrder={12}>
          <sphereGeometry args={[i === 0 ? 0.14 : 0.1, 12, 8]} />
          <meshBasicMaterial color={i === 0 ? '#ff9a4d' : '#ffd36b'} depthTest={false} transparent />
        </mesh>
      ))}
      {cursor && (
        <mesh position={[cursor[0], getTerrainHeight(cursor[0], cursor[1]) + 0.05, cursor[1]]} raycast={() => null} renderOrder={12}>
          <sphereGeometry args={[0.08, 12, 8]} />
          <meshBasicMaterial color="#ffffff" depthTest={false} transparent opacity={0.9} />
        </mesh>
      )}
      {last && cursor && label > 0.05 && (
        <Html
          position={[(last[0] + cursor[0]) / 2, getTerrainHeight(cursor[0], cursor[1]) + 0.6, (last[1] + cursor[1]) / 2]}
          center
          zIndexRange={[5, 0]}
          className="dim-label"
          style={{ pointerEvents: 'none' }}
        >
          {formatLength(label, unit)}
        </Html>
      )}
    </>
  )
}

