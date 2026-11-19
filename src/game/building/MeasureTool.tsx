import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { formatLength } from '../../services/units'
import { useEditorStore } from '../../stores/editorStore'
import type { Vec3 } from '../../types/world'
import { gizmoRecentlyUsed } from './interaction'
import { measure } from './measure'
import { raycastTerrain } from './PlacementSystem'

const CLICK_DRAG_TOLERANCE = 6

/**
 * Measure tool: click up to three points on anything (ground, walls, roofs). Two points give the straight
 * distance, its level run and its rise; a third gives the angle at the middle point. Click again to start over.
 */
export function MeasureTool() {
  const active = useEditorStore((s) => s.activeTool === 'measure')
  const points = useEditorStore((s) => s.measurePoints)
  const unit = useEditorStore((s) => s.unit)
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)

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
      if (!start || gizmoRecentlyUsed() || Math.hypot(e.clientX - start.x, e.clientY - start.y) > CLICK_DRAG_TOLERANCE) return
      const rect = element.getBoundingClientRect()
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const ground = raycastTerrain(ray.ray)
      const group = scene.getObjectByName('world-objects')
      const hit = group ? ray.intersectObjects(group.children, true).find((h) => h.object.visible) : undefined
      let point: THREE.Vector3 | null = ground?.point ?? null
      if (hit && (!ground || hit.distance < ground.distance)) point = hit.point
      if (!point) return
      const picked: Vec3 = [point.x, point.y, point.z]
      const current = useEditorStore.getState().measurePoints
      useEditorStore.setState({ measurePoints: current.length >= 3 ? [picked] : [...current, picked] })
    }
    element.addEventListener('pointerdown', onDown)
    element.addEventListener('pointerup', onUp)
    element.style.cursor = 'crosshair'
    return () => {
      element.removeEventListener('pointerdown', onDown)
      element.removeEventListener('pointerup', onUp)
      element.style.cursor = ''
      useEditorStore.setState({ measurePoints: [] })
    }
  }, [active, gl, camera, scene])

  const lines = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const vertices: THREE.Vector3[] = []
    for (let i = 0; i + 1 < points.length; i++) vertices.push(new THREE.Vector3(...points[i]), new THREE.Vector3(...points[i + 1]))
    // The level run and the rise of the first segment, as a right-angled guide.
    if (points.length >= 2) {
      const [a, b] = points
      const corner = new THREE.Vector3(b[0], a[1], b[2])
      vertices.push(new THREE.Vector3(...a), corner, corner, new THREE.Vector3(...b))
    }
    return geometry.setFromPoints(vertices)
  }, [points])
  useEffect(() => () => lines.dispose(), [lines])

  if (!active || points.length === 0) return null
  const result = measure(points)
  const middle = (a: Vec3, b: Vec3): [number, number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.3, (a[2] + b[2]) / 2]
  return (
    <>
      {points.map((p, i) => (
        <mesh key={i} position={p} raycast={() => null} renderOrder={14}>
          <sphereGeometry args={[0.09, 12, 8]} />
          <meshBasicMaterial color={i === 1 ? '#ff9a4d' : '#ffd36b'} depthTest={false} transparent />
        </mesh>
      ))}
      <lineSegments geometry={lines} renderOrder={13} raycast={() => null}>
        <lineBasicMaterial color="#ffd36b" depthTest={false} transparent opacity={0.9} />
      </lineSegments>
      {points.length >= 2 && result.length !== undefined && (
        <Html position={middle(points[0], points[1])} center zIndexRange={[5, 0]} className="dim-label" style={{ pointerEvents: 'none' }}>
          {formatLength(result.length, unit)}
          {result.rise !== undefined && Math.abs(result.rise) > 0.02 && ` (ngang ${formatLength(result.horizontal ?? 0, unit)}, cao ${formatLength(Math.abs(result.rise), unit)})`}
        </Html>
      )}
      {points.length >= 3 && result.angle !== undefined && (
        <Html position={[points[1][0], points[1][1] + 0.7, points[1][2]]} center zIndexRange={[5, 0]} className="dim-label" style={{ pointerEvents: 'none' }}>
          {result.angle.toFixed(1)}°
        </Html>
      )}
    </>
  )
}
