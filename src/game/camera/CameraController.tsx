import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useEditorStore } from '../../stores/editorStore'
import { useWorldStore } from '../../stores/worldStore'
import { isGizmoDragging } from '../building/interaction'
import { getWallHoles } from '../building/openings'
import { getTerrainHeight, WATER_LEVEL } from '../environment/terrain'
import { getDimensions } from '../geometry/GeometryFactory'
import { cameraCommands, type ViewPreset } from './cameraCommands'
import { cameraState, virtualInput } from './cameraState'
import { resolveCameraCollision } from './collision'

/**
 * Camera with two modes (toggle with C):
 *  - walk (default): you are a character. Dragging turns your head where you
 *    stand, solid objects stop you, the wheel steps forward/back.
 *  - orbit: drag turns around a point, right-drag pans, the wheel zooms.
 * Both: WASD (or the touch stick) moves level, E / Space up, Q / X down,
 * Shift faster, F focuses the selection, Esc cancels.
 */

export const START_POSITION: [number, number, number] = [7, 4.3, 59]
const START_TARGET: [number, number, number] = [5.5, 4.4, 46]

const KEY_DIRECTIONS: Record<string, [number, number, number]> = {
  KeyW: [0, 0, 1],
  KeyS: [0, 0, -1],
  KeyD: [1, 0, 0],
  KeyA: [-1, 0, 0],
  KeyE: [0, 1, 0],
  Space: [0, 1, 0],
  KeyQ: [0, -1, 0],
  KeyX: [0, -1, 0],
}
const SPEED_KEYS = new Set(['ShiftLeft', 'ShiftRight'])
const LOOK_SPEED = 0.0035
const MAX_PITCH = 1.5
const EYE_RADIUS = 0.3
const GROUND_CLEARANCE = 0.35
/** In walk mode the orbit point (used for shadows and the grid) stays this far ahead. */
const LOOK_AHEAD = 6

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

const VIEW_DIRECTIONS: Record<ViewPreset, THREE.Vector3> = {
  perspective: new THREE.Vector3(0.55, 0.5, 0.67).normalize(),
  top: new THREE.Vector3(0, 1, 0.001).normalize(),
  front: new THREE.Vector3(0, 0.02, 1).normalize(),
  side: new THREE.Vector3(1, 0.02, 0).normalize(),
}

export function CameraController() {
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const mode = useEditorStore((s) => s.cameraMode)
  const lookSpeed = useEditorStore((s) => s.lookSpeed)
  const pressed = useRef(new Set<string>())
  const look = useRef({ yaw: 0, pitch: 0 })
  const wheelSteps = useRef(0)
  /** Eased head turning (what the camera shows) and the walking velocity. */
  const shown = useRef({ yaw: 0, pitch: 0 })
  const velocity = useRef(new THREE.Vector3())
  /** A glide to a new place: where the camera and the orbit point started and where they end. */
  const glide = useRef<{ t: number; from: THREE.Vector3; to: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3 } | null>(null)

  // Face the starting view before either mode takes over.
  useEffect(() => {
    camera.lookAt(...START_TARGET)
    if (import.meta.env.DEV) (window as unknown as { __woodscapeCamera?: THREE.Camera }).__woodscapeCamera = camera
  }, [camera])

  // Keyboard and UI camera commands.
  useEffect(() => {
    const focusSelection = () => {
      const ctl = controls.current
      const id = useEditorStore.getState().selectedIds[0]
      const obj = id ? useWorldStore.getState().objects[id] : undefined
      if (!ctl || !obj) return
      useEditorStore.getState().setCameraMode('orbit')
      const size = getDimensions(obj.geometry)
      const distance = Math.max(2.5, Math.max(size.width, size.height, size.depth) * 2.4)
      const direction = camera.position.clone().sub(ctl.target).normalize()
      const toTarget = new THREE.Vector3(...obj.transform.position)
      glideTo(toTarget.clone().addScaledVector(direction, distance), toTarget)
    }

    /** Eases the camera (and the orbit point) to a new place over a fraction of a second. */
    const glideTo = (position: THREE.Vector3, target: THREE.Vector3) => {
      const ctl = controls.current
      if (!ctl) return
      if (!useEditorStore.getState().smoothMotion) {
        camera.position.copy(position)
        ctl.target.copy(target)
        ctl.update()
        return
      }
      glide.current = { t: 0, from: camera.position.clone(), to: position, fromTarget: ctl.target.clone(), toTarget: target }
    }

    const setView = (preset: ViewPreset) => {
      const ctl = controls.current
      if (!ctl) return
      useEditorStore.getState().setCameraMode('orbit')
      const distance = Math.max(12, camera.position.distanceTo(ctl.target))
      glideTo(ctl.target.clone().addScaledVector(VIEW_DIRECTIONS[preset], distance), ctl.target.clone())
    }

    const goTo = (x: number, z: number) => {
      const ctl = controls.current
      const height = camera.position.y - getTerrainHeight(camera.position.x, camera.position.z)
      const dx = x - camera.position.x
      const dz = z - camera.position.z
      const y = Math.max(getTerrainHeight(x, z), WATER_LEVEL) + Math.max(height, 1.7)
      if (ctl) glideTo(new THREE.Vector3(x, y, z), new THREE.Vector3(ctl.target.x + dx, ctl.target.y + (y - camera.position.y), ctl.target.z + dz))
      else camera.position.set(x, y, z)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.code in KEY_DIRECTIONS || SPEED_KEYS.has(e.code)) {
        pressed.current.add(e.code)
        // Space would otherwise "click" whichever button was used last.
        if (e.code === 'Space') {
          e.preventDefault()
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        }
      } else if (e.code === 'KeyF') focusSelection()
      else if (e.code === 'KeyC') {
        const editor = useEditorStore.getState()
        editor.setCameraMode(editor.cameraMode === 'orbit' ? 'walk' : 'orbit')
      } else if (e.code === 'Escape') useEditorStore.getState().cancel()
    }
    const onKeyUp = (e: KeyboardEvent) => pressed.current.delete(e.code)
    const clear = () => pressed.current.clear()

    const unsubscribe = cameraCommands.subscribe((command) => {
      if (command.type === 'focus') focusSelection()
      else if (command.type === 'goto') goTo(command.x, command.z)
      else setView(command.preset)
    })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clear)
    return () => {
      unsubscribe()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clear)
    }
  }, [camera])

  // Walk mode: keep the current view direction, then turn the head by dragging (mouse or finger).
  useEffect(() => {
    if (mode !== 'walk') return
    const direction = camera.getWorldDirection(new THREE.Vector3())
    look.current.yaw = Math.atan2(-direction.x, -direction.z)
    look.current.pitch = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1))
    shown.current.yaw = look.current.yaw
    shown.current.pitch = look.current.pitch
    camera.rotation.order = 'YXZ'

    const element = gl.domElement
    let drag: { id: number; x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => {
      if (drag === null && (e.pointerType !== 'mouse' || e.button === 0 || e.button === 2)) {
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY }
      }
    }
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      drag.x = e.clientX
      drag.y = e.clientY
      if (isGizmoDragging()) return
      const speed = LOOK_SPEED * useEditorStore.getState().lookSpeed
      look.current.yaw -= dx * speed
      look.current.pitch = THREE.MathUtils.clamp(look.current.pitch - dy * speed, -MAX_PITCH, MAX_PITCH)
    }
    const onUp = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.id) drag = null
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      wheelSteps.current -= Math.sign(e.deltaY)
    }
    const onContextMenu = (e: Event) => e.preventDefault()
    element.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    element.addEventListener('wheel', onWheel, { passive: false })
    element.addEventListener('contextmenu', onContextMenu)
    return () => {
      element.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      element.removeEventListener('wheel', onWheel)
      element.removeEventListener('contextmenu', onContextMenu)
      // Hand back to orbit: turn around a point straight ahead.
      const ctl = controls.current
      if (ctl) {
        ctl.target.copy(camera.position).addScaledVector(camera.getWorldDirection(new THREE.Vector3()), LOOK_AHEAD)
        ctl.update()
      }
    }
  }, [mode, camera, gl])

  const forward = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())
  const view = useRef(new THREE.Vector3())
  const step = useRef(new THREE.Vector3())
  const before = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const ctl = controls.current
    if (!ctl) return
    const editor = useEditorStore.getState()
    const walking = editor.cameraMode === 'walk'
    // TransformControls re-enables the default controls after a drag, so this is set every frame.
    ctl.enabled = !walking && !isGizmoDragging()

    // Comfort: field of view, and the head turns with a little ease instead of snapping to the finger.
    if (Math.abs((camera as THREE.PerspectiveCamera).fov - editor.fov) > 0.01) {
      ;(camera as THREE.PerspectiveCamera).fov = editor.fov
      camera.updateProjectionMatrix()
    }
    if (walking) {
      const ease = editor.smoothMotion ? 1 - Math.exp(-Math.min(delta, 0.1) * 22) : 1
      shown.current.yaw += (look.current.yaw - shown.current.yaw) * ease
      shown.current.pitch += (look.current.pitch - shown.current.pitch) * ease
      camera.rotation.set(shown.current.pitch, shown.current.yaw, 0)
    }

    if (glide.current) {
      const g = glide.current
      g.t = Math.min(1, g.t + Math.min(delta, 0.1) / 0.45)
      const eased = g.t * g.t * (3 - 2 * g.t)
      camera.position.lerpVectors(g.from, g.to, eased)
      ctl.target.lerpVectors(g.fromTarget, g.toTarget, eased)
      if (!walking) ctl.update()
      if (g.t >= 1) glide.current = null
    }

    // Movement: level with the ground along the view heading, plus straight up/down.
    before.current.copy(camera.position)
    const keys = pressed.current
    camera.getWorldDirection(view.current)
    forward.current.copy(view.current)
    forward.current.y = 0
    if (forward.current.lengthSq() < 1e-6) forward.current.set(0, 0, -1)
    forward.current.normalize()
    right.current.crossVectors(forward.current, camera.up).normalize()

    step.current.set(0, 0, 0)
    for (const code of keys) {
      const direction = KEY_DIRECTIONS[code]
      if (!direction) continue
      step.current.addScaledVector(right.current, direction[0])
      step.current.y += direction[1]
      step.current.addScaledVector(forward.current, direction[2])
    }
    step.current.addScaledVector(right.current, virtualInput.moveX)
    step.current.addScaledVector(forward.current, virtualInput.moveForward)
    step.current.y += virtualInput.vertical
    // Wanted velocity (m/s); the real one follows it with a short ease so starting and stopping never jerk.
    const dt = Math.min(delta, 0.1)
    const fast = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 3 : 1
    // Walking among buildings wants a gentler pace than flying over the valley.
    const speed = editor.cameraSpeed * (walking ? 0.45 : 1) * fast
    const wanted = step.current
    const amount = Math.min(1, wanted.length())
    if (amount > 1e-3) wanted.normalize().multiplyScalar(amount * speed)
    else wanted.set(0, 0, 0)
    if (wanted.lengthSq() > 0) glide.current = null
    if (editor.smoothMotion) velocity.current.lerp(wanted, 1 - Math.exp(-dt * 9))
    else velocity.current.copy(wanted)
    if (velocity.current.lengthSq() < 1e-4 && wanted.lengthSq() === 0) velocity.current.set(0, 0, 0)
    step.current.copy(velocity.current).multiplyScalar(dt)
    const moving = step.current.lengthSq() > 1e-12
    if (moving) camera.position.add(step.current)
    cameraState.speed = velocity.current.length()
    if (wheelSteps.current !== 0) {
      glide.current = null
      camera.position.addScaledVector(view.current, wheelSteps.current * 0.6)
      wheelSteps.current = 0
    }

    if (walking && editor.collisionEnabled) {
      const objects = useWorldStore.getState().objects
      resolveCameraCollision(camera.position, EYE_RADIUS, Object.values(objects), getWallHoles(objects))
    }

    // Never sink into the ground or the water.
    const floor = Math.max(getTerrainHeight(camera.position.x, camera.position.z), WATER_LEVEL) + GROUND_CLEARANCE
    if (camera.position.y < floor) camera.position.y = floor

    if (walking) {
      // Keep the orbit point ahead of the eye: shadows and the build grid follow it.
      ctl.target.copy(camera.position).addScaledVector(view.current, LOOK_AHEAD)
    } else if (moving) {
      // Carry the orbit point along so moving never changes the viewing angle.
      ctl.target.add(step.current.copy(camera.position).sub(before.current))
      const targetFloor = getTerrainHeight(ctl.target.x, ctl.target.z)
      if (ctl.target.y < targetFloor) ctl.target.y = targetFloor
    }

    cameraState.x = camera.position.x
    cameraState.y = camera.position.y
    cameraState.z = camera.position.z
    cameraState.yaw = Math.atan2(-view.current.x, -view.current.z)
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      rotateSpeed={lookSpeed}
      target={START_TARGET}
      minDistance={0.5}
      maxDistance={450}
      maxPolarAngle={Math.PI * 0.5}
    />
  )
}
