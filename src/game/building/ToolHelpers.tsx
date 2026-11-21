import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useEditorStore } from '../../stores/editorStore'
import { useWorldStore } from '../../stores/worldStore'
import { getTerrainHeight } from '../environment/terrain'
import type { BrushStroke } from '../../types/world'
import { boundsOf, FACE_AXES, faceCoords, faceOfNormal, getBrushLayer, MAX_DABS_PER_OBJECT, type BrushLayer } from '../materials/brushPaint'
import { brushObjects, paintObjects } from './commands'
import { hitMatrix, objectIdFromHit, setGizmoDragging } from './interaction'
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
    // Brush mode: the stroke being painted on each object, kept (one undo step) when the pointer lifts.
    const BRUSHABLE = new Set(['box', 'panel', 'prism', 'extrude'])
    let brush: Map<string, { layer: BrushLayer; stroke: BrushStroke; last: [number, number, number] | null }> | null = null
    let lastPointer: { x: number; y: number } | null = null

    const objectAt = (e: PointerEvent): string | null => {
      const rect = element.getBoundingClientRect()
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const group = scene.getObjectByName('world-objects')
      const hit = group ? raycaster.intersectObjects(group.children, true)[0] : undefined
      const objects = useWorldStore.getState().objects
      return objectIdFromHit(hit, objects)
    }
    const dab = (x: number, y: number) => {
      if (!brush) return
      const rect = element.getBoundingClientRect()
      pointer.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const group = scene.getObjectByName('world-objects')
      const hit = group ? raycaster.intersectObjects(group.children, true)[0] : undefined
      if (!hit || !hit.face) return
      const objects = useWorldStore.getState().objects
      const id = objectIdFromHit(hit, objects)
      const obj = id ? objects[id] : undefined
      const geometry = (hit.object as THREE.Mesh).geometry
      if (!id || !obj || obj.locked || !BRUSHABLE.has(obj.geometry.shape) || !geometry) return
      const editor = useEditorStore.getState()
      const bounds = boundsOf(geometry)
      let entry = brush.get(id)
      if (!entry) {
        if (editor.paintErase && !obj.brush) return
        const layer = getBrushLayer(id, bounds)
        layer.sync(obj.brush)
        const meta = { color: editor.paintColor, alpha: editor.paintStrength, radius: editor.paintSize, erase: editor.paintErase || undefined }
        layer.beginStroke(meta)
        entry = { layer, stroke: { ...meta, dabs: [] }, last: null }
        brush.set(id, entry)
        // First time on this object: show the brush layer at once instead of waiting for the stroke to end.
        const mesh = hit.object as THREE.Mesh
        if (!obj.brush && !(mesh as THREE.InstancedMesh).isInstancedMesh && mesh.name === id) mesh.material = layer.materialsFor(mesh.material)
      }
      const already = obj.brush?.reduce((n, s) => n + s.dabs.length / 3, 0) ?? 0
      if (already + entry.stroke.dabs.length / 3 >= MAX_DABS_PER_OBJECT) return
      const local = hit.point.clone().applyMatrix4(hitMatrix(hit).invert())
      const face = faceOfNormal(hit.face.normal)
      const [u, v] = faceCoords(face, local, bounds)
      const last = entry.last
      if (last && last[0] === face) {
        const [ai, bi] = FACE_AXES[face]
        if (Math.hypot((u - last[1]) * bounds.size.getComponent(ai), (v - last[2]) * bounds.size.getComponent(bi)) < entry.stroke.radius * 0.3) return
      }
      entry.last = [face, u, v]
      entry.stroke.dabs.push(face, Math.round(u * 1000) / 1000, Math.round(v * 1000) / 1000)
      entry.layer.addDab(entry.stroke, face, u, v)
    }
    const sweep = (e: PointerEvent) => {
      // Fill the gaps when the pointer jumps: a dab roughly every 6 pixels along the way.
      const from = lastPointer ?? { x: e.clientX, y: e.clientY }
      const steps = Math.min(40, Math.max(1, Math.ceil(Math.hypot(e.clientX - from.x, e.clientY - from.y) / 6)))
      for (let i = 1; i <= steps; i++) dab(from.x + ((e.clientX - from.x) * i) / steps, from.y + ((e.clientY - from.y) * i) / steps)
      lastPointer = { x: e.clientX, y: e.clientY }
    }
    const finishBrush = () => {
      if (!brush) return
      const entries = brush
      brush = null
      lastPointer = null
      const done: Record<string, BrushStroke> = {}
      for (const [id, entry] of entries) {
        entry.layer.endStroke()
        if (entry.stroke.dabs.length > 0) done[id] = entry.stroke
      }
      if (Object.keys(done).length === 0) return
      brushObjects(done)
      // The picture already shows these strokes; tell it so it does not redraw them.
      const objects = useWorldStore.getState().objects
      for (const id of Object.keys(done)) entries.get(id)!.layer.synced = objects[id]?.brush
    }
    const apply = (e: PointerEvent) => {
      if (useEditorStore.getState().paintMode === 'brush') {
        sweep(e)
        return
      }
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
      if (useEditorStore.getState().paintMode === 'brush') {
        brush = new Map()
        lastPointer = null
      }
      // Holds the camera still while the brush is down.
      setGizmoDragging(true)
      apply(e)
    }
    const onMove = (e: PointerEvent) => apply(e)
    const onUp = () => {
      if (!stroke) return
      finishBrush()
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
