import { Grid } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { createObjectFromPreset, getShapePreset, type ShapePreset } from '../../data/shapePresets'
import { useEditorStore } from '../../stores/editorStore'
import { getTerrainHeight } from '../environment/terrain'
import { useWorldStore } from '../../stores/worldStore'
import type { WorldObject } from '../../types/world'
import { getDimensions, getGeometry, isBoxLike, isOpening } from '../geometry/GeometryFactory'
import { addObject, createObjectId, roundMm } from './commands'
import { gizmoRecentlyUsed, markGizmoInteraction, snapToGrid } from './interaction'
import { snapToNeighbours } from './snapping'

const CLICK_DRAG_TOLERANCE = 5
/** A second tap this close (pixels) to the first one confirms the placement. */
const CONFIRM_TAP_RADIUS = 36

/** First point where a ray meets the terrain height function, or null. */
export function raycastTerrain(ray: THREE.Ray, maxDistance = 800): { distance: number; point: THREE.Vector3 } | null {
  const point = new THREE.Vector3()
  let previous = 0
  let t = 0
  while (t < maxDistance) {
    ray.at(t, point)
    const above = point.y - getTerrainHeight(point.x, point.z)
    if (above <= 0) {
      let low = previous
      let high = t
      for (let i = 0; i < 14; i++) {
        const mid = (low + high) / 2
        ray.at(mid, point)
        if (point.y - getTerrainHeight(point.x, point.z) > 0) low = mid
        else high = mid
      }
      ray.at(high, point)
      return { distance: high, point }
    }
    previous = t
    t += Math.max(0.25, above * 0.5)
  }
  return null
}

interface Target {
  position: THREE.Vector3
  /** Set when the object snaps into a wall (doors, windows): the wall fixes its facing. */
  wallYaw: number | null
}

/**
 * Where an object of `preset` would go for the given pointer ray.
 * For now everything stands on the ground (no stacking on other objects, no
 * digging in, no falling): only doors, windows and openings go into walls.
 */
function targetFromRay(raycaster: THREE.Raycaster, preset: ShapePreset, scene: THREE.Scene, yaw: number): Target | null {
  const size = getDimensions(preset.geometry)
  const ground = raycastTerrain(raycaster.ray)

  if (isOpening(preset.geometry.shape)) {
    const group = scene.getObjectByName('world-objects')
    const hit = group ? raycaster.intersectObjects(group.children, true)[0] : undefined
    if (hit?.face && (!ground || hit.distance < ground.distance)) {
      const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
      const wall = Math.abs(normal.y) < 0.3 ? findWall(hit.object) : undefined
      if (wall) {
        // Doors and windows go INTO the wall they are pointed at; the wall opens around them.
        // Along the wall they stay clear of its ends and click to its middle; windows settle at sill height.
        const wallSize = getDimensions(wall.geometry)
        const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(...wall.transform.rotation))
        const local = hit.point.clone().sub(new THREE.Vector3(...wall.transform.position)).applyQuaternion(rotation.clone().invert())
        const alongX = wallSize.width > wallSize.depth
        const length = alongX ? wallSize.width : wallSize.depth
        const margin = Math.min(size.width / 2 + 0.15, length / 2)
        let u = THREE.MathUtils.clamp(alongX ? local.x : local.z, -length / 2 + margin, length / 2 - margin)
        if (Math.abs(u) < 0.3) u = 0
        else u = snapToGrid(u)
        const floor = -wallSize.height / 2 + 0.05
        let v = local.y
        if (preset.geometry.shape === 'door') v = floor + size.height / 2
        else {
          const sill = floor + 0.9 + size.height / 2
          v = Math.abs(v - sill) < 0.35 ? sill : THREE.MathUtils.clamp(v, floor + size.height / 2, wallSize.height / 2 - size.height / 2 - 0.1)
        }
        const centre = (alongX ? new THREE.Vector3(u, v, 0) : new THREE.Vector3(0, v, u)).applyQuaternion(rotation).add(new THREE.Vector3(...wall.transform.position))
        const position = centre
        return { position, wallYaw: Math.atan2(normal.x, normal.z) }
      }
    }
  }
  if (!ground) return null
  const x = snapToGrid(ground.point.x)
  const z = snapToGrid(ground.point.z)
  const position = new THREE.Vector3(x, getTerrainHeight(x, z) + size.height / 2, z)
  // Line up with whatever is already standing nearby.
  position.set(...snapToNeighbours(preset.geometry, [position.x, position.y, position.z], [0, yaw, 0]))
  // Snapping may only slide the object sideways; it always rests on the ground.
  position.y = getTerrainHeight(position.x, position.z) + size.height / 2
  return { position, wallYaw: null }
}

/** Puts the previewed object into the world. */
export function confirmPlacement(): void {
  const editor = useEditorStore.getState()
  const preset = getShapePreset(editor.placingPresetId)
  const pending = editor.placePending
  if (!preset || !pending) return
  const yaw = pending.wallYaw ?? editor.placeYaw
  const obj = createObjectFromPreset(
    preset,
    createObjectId(preset.type),
    [roundMm(pending.x), roundMm(pending.y), roundMm(pending.z)],
    [0, yaw, 0],
  )
  addObject(obj)
  // The same tap must not go on to select whatever is under the finger.
  markGizmoInteraction()
  useEditorStore.setState({ activeTool: 'move', placingPresetId: null, placePending: null, placeYaw: 0, selectedIds: [obj.id] })
}

/**
 * Place tool. With a mouse the preview follows the pointer and a click places
 * it (R turns it). On a touch screen the first tap chooses the spot, the turn
 * buttons rotate it, and a second tap on the same spot, or the "Đặt" button,
 * confirms.
 */
export function PlacementSystem() {
  const presetId = useEditorStore((s) => (s.activeTool === 'place' ? s.placingPresetId : null))
  const preset = getShapePreset(presetId)
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const ghost = useRef<THREE.Mesh>(null)
  const geometry = useMemo(() => (preset ? getGeometry(preset.geometry) : null), [preset])

  useFrame(({ raycaster, pointer }) => {
    if (!preset || !ghost.current) return
    const editor = useEditorStore.getState()
    const pending = editor.placePending
    if (pending) {
      ghost.current.visible = true
      ghost.current.position.set(pending.x, pending.y, pending.z)
      ghost.current.rotation.set(0, pending.wallYaw ?? editor.placeYaw, 0)
      return
    }
    raycaster.setFromCamera(pointer, camera)
    const target = targetFromRay(raycaster, preset, scene, editor.placeYaw)
    ghost.current.visible = target !== null
    if (target) {
      ghost.current.position.copy(target.position)
      ghost.current.rotation.set(0, target.wallYaw ?? editor.placeYaw, 0)
    }
  })

  useEffect(() => {
    if (!preset) return
    const element = gl.domElement
    const raycaster = new THREE.Raycaster()
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
      const editor = useEditorStore.getState()

      const rect = element.getBoundingClientRect()
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      const target = targetFromRay(raycaster, preset, scene, editor.placeYaw)
      const pendingNow = editor.placePending

      if (e.pointerType === 'mouse') {
        if (!target) return
        useEditorStore.setState({
          placePending: { x: target.position.x, y: target.position.y, z: target.position.z, wallYaw: target.wallYaw, sx: e.clientX, sy: e.clientY },
        })
        confirmPlacement()
        return
      }

      // Touch: a second tap on the chosen spot confirms; a tap elsewhere moves the preview.
      if (pendingNow && Math.hypot(e.clientX - pendingNow.sx, e.clientY - pendingNow.sy) < CONFIRM_TAP_RADIUS) {
        confirmPlacement()
        return
      }
      if (!target) return
      useEditorStore.setState({
        placePending: { x: target.position.x, y: target.position.y, z: target.position.z, wallYaw: target.wallYaw, sx: e.clientX, sy: e.clientY },
      })
    }
    element.addEventListener('pointerdown', onDown)
    element.addEventListener('pointerup', onUp)
    element.style.cursor = 'crosshair'
    return () => {
      element.removeEventListener('pointerdown', onDown)
      element.removeEventListener('pointerup', onUp)
      element.style.cursor = ''
    }
  }, [gl, preset, camera, scene])

  if (!preset || !geometry) return null
  return (
    <mesh ref={ghost} geometry={geometry} visible={false} raycast={() => null} renderOrder={9}>
      <meshBasicMaterial color="#ffd36b" transparent opacity={0.55} depthWrite={false} />
    </mesh>
  )
}

/** The box-shaped world object a scene node belongs to, if any. */
function findWall(node: THREE.Object3D | null): WorldObject | undefined {
  const objects = useWorldStore.getState().objects
  for (let current = node; current; current = current.parent) {
    const obj = objects[current.name]
    if (obj) return isBoxLike(obj.geometry.shape) ? obj : undefined
  }
  return undefined
}

/** Snap grid, shown while placing or moving with snapping on. Sits on the ground under the camera target. */
export function BuildGrid() {
  const visible = useEditorStore(
    (s) => s.snapEnabled && (s.activeTool === 'place' || s.activeTool === 'move' || s.activeTool === 'mark' || s.activeTool === 'draw'),
  )
  const gridStep = useEditorStore((s) => s.gridStep)
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null
  const group = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!group.current || !controls) return
    const { x, z } = controls.target
    group.current.position.y = getTerrainHeight(x, z) + 0.015
  })

  if (!visible) return null
  const cellSize = gridStep < 0.25 ? 0.5 : gridStep
  return (
    <group ref={group}>
      <Grid
        infiniteGrid
        followCamera
        cellSize={cellSize}
        sectionSize={cellSize <= 0.5 ? 1 : cellSize * 5}
        cellColor="#ffffff"
        sectionColor="#fff3c4"
        cellThickness={0.6}
        sectionThickness={1}
        fadeDistance={45}
        fadeStrength={2}
      />
    </group>
  )
}
