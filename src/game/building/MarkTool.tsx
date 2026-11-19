import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { formatLength } from '../../services/units'
import { useEditorStore } from '../../stores/editorStore'
import type { WorldObject } from '../../types/world'
import { getTerrainHeight } from '../environment/terrain'
import { addObject, addObjects, createObjectId, roundMm } from './commands'
import { forceStraight, type Pt } from './drawing'
import { gizmoRecentlyUsed, setGizmoDragging, snapToGrid, straightWanted } from './interaction'
import { isClosedStroke, polygonArea, simplifyStroke, strokeLength } from './markStroke'
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
/** The pen takes a new point after moving this far (m); the finished stroke is tidied to this tolerance. */
const PEN_STEP = 0.12
const PEN_TOLERANCE = 0.06
/** How long the measurement of a finished stroke stays on screen. */
const RESULT_MS = 9000

interface StrokeResult {
  at: [number, number, number]
  text: string
  until: number
}

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
  const mode = useEditorStore((s) => s.markMode)
  const camera = useThree((state) => state.camera)
  const [stroke, setStroke] = useState<Pt[]>([])
  const [result, setResult] = useState<StrokeResult | null>(null)
  const penRef = useRef<Pt[] | null>(null)

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
    if (mode === 'pen') {
      start.current = null
      setLength(0)
      return penHandlers(element)
    }
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
  }, [active, gl, mode])

  /** Freehand pen: hold and drag to draw; on release the stroke is tidied, chalked down and measured. */
  function penHandlers(element: HTMLCanvasElement) {
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const pointAt = (e: PointerEvent): Pt | null => {
      const rect = element.getBoundingClientRect()
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const hit = raycastTerrain(ray.ray)
      return hit ? [hit.point.x, hit.point.z] : null
    }
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || gizmoRecentlyUsed()) return
      const first = pointAt(e)
      if (!first) return
      penRef.current = [first]
      setStroke([first])
      setResult(null)
      // The camera stays still while the pen is down.
      setGizmoDragging(true)
    }
    const onMove = (e: PointerEvent) => {
      const points = penRef.current
      if (!points) return
      const next = pointAt(e)
      const last = points[points.length - 1]
      if (!next || Math.hypot(next[0] - last[0], next[1] - last[1]) < PEN_STEP) return
      points.push(next)
      setStroke([...points])
    }
    const onUp = () => {
      const points = penRef.current
      if (!points) return
      penRef.current = null
      setGizmoDragging(false)
      setStroke([])
      if (points.length < 2) return
      const tidy = simplifyStroke(points, PEN_TOLERANCE)
      const unitNow = useEditorStore.getState().unit
      const total = strokeLength(tidy)
      if (total < 0.1) return
      const closed = isClosedStroke(tidy, 0.5)
      const loop: Pt[] = closed ? [...tidy.slice(0, -1), tidy[0]] : tidy
      const groupId = createObjectId('group')
      const name = `Nét vẽ ${formatLength(strokeLength(loop), unitNow)}`
      const pieces: WorldObject[] = []
      for (let i = 1; i < loop.length; i++) {
        const [x0, z0] = loop[i - 1]
        const [x1, z1] = loop[i]
        const distance = Math.hypot(x1 - x0, z1 - z0)
        if (distance < 0.02) continue
        const mx = (x0 + x1) / 2
        const mz = (z0 + z1) / 2
        pieces.push({
          id: createObjectId('mark_line'),
          type: 'mark_line',
          name,
          groupId,
          groupName: name,
          materialId: 'chalk_white',
          // A little longer than the segment so neighbouring pieces overlap into one smooth line.
          geometry: { shape: 'box', width: LINE_WIDTH, height: LINE_HEIGHT, depth: roundMm(distance + LINE_WIDTH * 0.5) },
          transform: { position: [roundMm(mx), roundMm(getTerrainHeight(mx, mz) + 0.02), roundMm(mz)], rotation: [0, Math.atan2(x1 - x0, z1 - z0), 0] },
          locked: false,
        })
      }
      addObjects(pieces, 'DrawStroke')
      const length = strokeLength(loop)
      const middle = loop[Math.floor(loop.length / 2)]
      const text = closed
        ? `Chu vi ${formatLength(length, unitNow)}, diện tích ${polygonArea(loop).toFixed(1)} m²`
        : `Dài ${formatLength(length, unitNow)}`
      setResult({ at: [middle[0], getTerrainHeight(middle[0], middle[1]) + 0.9, middle[1]], text, until: performance.now() + RESULT_MS })
    }
    element.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    element.style.cursor = 'crosshair'
    return () => {
      element.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      element.style.cursor = ''
      if (penRef.current) setGizmoDragging(false)
      penRef.current = null
      setStroke([])
    }
  }

  // The measurement of the last stroke fades after a while.
  useEffect(() => {
    if (!result) return
    const timer = window.setTimeout(() => setResult(null), Math.max(0, result.until - performance.now()))
    return () => window.clearTimeout(timer)
  }, [result])

  const strokeGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const vertices: THREE.Vector3[] = []
    for (let i = 1; i < stroke.length; i++) {
      vertices.push(new THREE.Vector3(stroke[i - 1][0], getTerrainHeight(...stroke[i - 1]) + 0.05, stroke[i - 1][1]))
      vertices.push(new THREE.Vector3(stroke[i][0], getTerrainHeight(...stroke[i]) + 0.05, stroke[i][1]))
    }
    return geometry.setFromPoints(vertices)
  }, [stroke])
  useEffect(() => () => strokeGeometry.dispose(), [strokeGeometry])

  if (!active) return null
  return (
    <>
      {stroke.length > 1 && (
        <lineSegments geometry={strokeGeometry} raycast={() => null} renderOrder={11}>
          <lineBasicMaterial color="#ffffff" depthTest={false} transparent opacity={0.95} />
        </lineSegments>
      )}
      {stroke.length > 1 && (
        <Html position={[stroke[stroke.length - 1][0], getTerrainHeight(...stroke[stroke.length - 1]) + 0.7, stroke[stroke.length - 1][1]]} center zIndexRange={[5, 0]} className="dim-label" style={{ pointerEvents: 'none' }}>
          {formatLength(strokeLength(stroke), unit)}
        </Html>
      )}
      {result && (
        <Html position={result.at} center zIndexRange={[5, 0]} className="dim-label" style={{ pointerEvents: 'none' }}>
          {result.text}
        </Html>
      )}
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
