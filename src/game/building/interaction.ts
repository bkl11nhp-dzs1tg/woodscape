import * as THREE from 'three'
import { useEditorStore } from '../../stores/editorStore'

/** Scene-side bookkeeping shared by selection, the transform gizmo and placement. */

/** Live meshes by object ID. The store stays the source of truth; this is only a lookup. */
export const objectMeshes = new Map<string, THREE.Object3D>()

/**
 * The world object a ray hit belongs to. Repeated pieces are drawn as one instanced mesh that
 * lists its objects in `userData.instanceIds`; everything else is found by node name.
 */
export function objectIdFromHit(hit: THREE.Intersection | undefined, objects: Record<string, unknown>): string | null {
  if (!hit) return null
  const instanceIds = hit.object.userData.instanceIds as string[] | undefined
  if (instanceIds && hit.instanceId !== undefined) return instanceIds[hit.instanceId] ?? null
  for (let node: THREE.Object3D | null = hit.object; node; node = node.parent) {
    if (node.name in objects) return node.name
  }
  return null
}

/** World matrix of what a ray hit, including the instance's own placement. */
export function hitMatrix(hit: THREE.Intersection): THREE.Matrix4 {
  const matrix = hit.object.matrixWorld.clone()
  const mesh = hit.object as THREE.InstancedMesh
  if (mesh.isInstancedMesh && hit.instanceId !== undefined) {
    const local = new THREE.Matrix4()
    mesh.getMatrixAt(hit.instanceId, local)
    matrix.multiply(local)
  }
  return matrix
}

let gizmoUsedAt = -Infinity

/** Called when the transform gizmo is grabbed, so the same click does not also select or deselect. */
export function markGizmoInteraction(): void {
  gizmoUsedAt = performance.now()
}

let gizmoDragging = false

/** True while a gizmo handle is held, so camera look-drag stays out of the way. */
export function setGizmoDragging(dragging: boolean): void {
  gizmoDragging = dragging
  markGizmoInteraction()
}

export function isGizmoDragging(): boolean {
  return gizmoDragging
}

export function gizmoRecentlyUsed(): boolean {
  return performance.now() - gizmoUsedAt < 300
}

/** Snaps a length to the grid when snapping is on. */
export function snapToGrid(value: number): number {
  const { snapEnabled, gridStep } = useEditorStore.getState()
  return snapEnabled ? snapValue(value, gridStep) : value
}

export function snapValue(value: number, step: number): number {
  return Math.round(value / step) * step
}

export const ROTATION_SNAP = Math.PI / 12

let lastPointerType = 'mouse'
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (e) => (lastPointerType = e.pointerType), true)
}

/** True when the last thing the player used was a finger or a pen, not a mouse. */
export function usingTouch(): boolean {
  return lastPointerType !== 'mouse'
}

let shiftHeld = false
if (typeof window !== 'undefined') {
  const track = (e: KeyboardEvent) => (shiftHeld = e.shiftKey)
  window.addEventListener('keydown', track)
  window.addEventListener('keyup', track)
  window.addEventListener('blur', () => (shiftHeld = false))
}

/** True when lines should be held straight: Shift is down, or the "Thẳng" switch is on (phones). */
export function straightWanted(): boolean {
  return shiftHeld || useEditorStore.getState().straightLock
}
