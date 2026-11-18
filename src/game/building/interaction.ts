import type * as THREE from 'three'
import { useEditorStore } from '../../stores/editorStore'

/** Scene-side bookkeeping shared by selection, the transform gizmo and placement. */

/** Live meshes by object ID. The store stays the source of truth; this is only a lookup. */
export const objectMeshes = new Map<string, THREE.Object3D>()

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
