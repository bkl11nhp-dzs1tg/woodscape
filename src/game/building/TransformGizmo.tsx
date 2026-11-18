import { TransformControls } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useEditorStore } from '../../stores/editorStore'
import { useWorldStore } from '../../stores/worldStore'
import type { Vec3 } from '../../types/world'
import { transformObjects, type TransformUpdate } from './commands'
import { objectMeshes, ROTATION_SNAP, setGizmoDragging, usingTouch } from './interaction'
import { cancelPendingMove } from './pending'
import { snapToNeighbours } from './snapping'

const COARSE = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

/**
 * X / Y / Z handles for whatever is selected. They show as soon as something is
 * picked (arrows with Select or Move, rings with Rotate). With several objects
 * selected the handles sit at their center and carry all of them together.
 * Meshes follow the drag live; the result becomes one undoable command on release.
 */
export function TransformGizmo() {
  const tool = useEditorStore((s) => s.activeTool)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const gridStep = useEditorStore((s) => s.gridStep)
  const objects = useWorldStore((s) => s.objects)
  const pivot = useMemo(() => new THREE.Object3D(), [])
  const [ready, setReady] = useState(false)
  const drag = useRef<{ pivot: THREE.Matrix4; starts: Map<string, THREE.Matrix4> } | null>(null)

  const ids = useMemo(() => selectedIds.filter((id) => objects[id] && !objects[id].locked), [selectedIds, objects])
  const editing = useEditorStore((s) => s.appMode === 'edit')
  const pendingMove = useEditorStore((s) => s.pendingMove)
  const active = editing && (tool === 'select' || tool === 'move' || tool === 'rotate') && ids.length > 0

  // Park the handles at the center of the selection whenever it (or the data) changes.
  useEffect(() => {
    if (!active) {
      setReady(false)
      return
    }
    const center = new THREE.Vector3()
    ids.forEach((id) => center.add(new THREE.Vector3(...objects[id].transform.position)))
    pivot.position.copy(center.divideScalar(ids.length))
    pivot.rotation.set(0, 0, 0)
    pivot.updateMatrixWorld()
    setReady(true)
  }, [active, ids, objects, pivot, pendingMove])

  // Changing the selection or the tool abandons a move that was never confirmed.
  const idsKey = ids.join('|')
  useEffect(
    () => () => {
      if (useEditorStore.getState().pendingMove) cancelPendingMove()
    },
    [idsKey, tool, editing],
  )

  if (!active || !ready) return null

  const start = () => {
    setGizmoDragging(true)
    pivot.updateMatrix()
    const starts = new Map<string, THREE.Matrix4>()
    for (const id of ids) {
      const node = objectMeshes.get(id)
      if (!node) continue
      node.updateMatrix()
      starts.set(id, node.matrix.clone())
    }
    drag.current = { pivot: pivot.matrix.clone(), starts }
  }

  const follow = () => {
    const state = drag.current
    if (!state) return
    pivot.updateMatrix()
    const delta = pivot.matrix.clone().multiply(state.pivot.clone().invert())
    const scale = new THREE.Vector3()
    state.starts.forEach((matrix, id) => {
      const node = objectMeshes.get(id)
      if (node) delta.clone().multiply(matrix).decompose(node.position, node.quaternion, scale)
    })
  }

  const commit = () => {
    setGizmoDragging(false)
    const state = drag.current
    drag.current = null
    if (!state) return
    const updates: TransformUpdate[] = []
    state.starts.forEach((_, id) => {
      const node = objectMeshes.get(id)
      const obj = objects[id]
      if (!node || !obj) return
      let position: Vec3 = [node.position.x, node.position.y, node.position.z]
      const rotation: Vec3 = [node.rotation.x, node.rotation.y, node.rotation.z]
      // A single object dropped next to others is pulled flush against them.
      if (tool !== 'rotate' && state.starts.size === 1) position = snapToNeighbours(obj.geometry, position, rotation, id)
      node.position.set(...position)
      updates.push({ id, position, rotation })
    })
    const label = tool === 'rotate' ? 'RotateObject' : 'MoveObject'
    if (!usingTouch()) {
      transformObjects(updates, label)
      return
    }
    // Touch: leave the object where it was dropped and ask for confirmation.
    const before = useEditorStore.getState().pendingMove
    const original = { ...(before?.original ?? {}) }
    for (const update of updates) {
      const obj = objects[update.id]
      if (obj && !(update.id in original)) original[update.id] = { position: [...obj.transform.position], rotation: [...obj.transform.rotation] }
    }
    const proposed = [...(before?.proposed ?? []).filter((old) => !updates.some((update) => update.id === old.id)), ...updates]
    useEditorStore.setState({ pendingMove: { original, proposed, label } })
  }

  return (
    <>
      <primitive object={pivot} />
      <TransformControls
        object={pivot}
        mode={tool === 'rotate' ? 'rotate' : 'translate'}
        size={COARSE ? 1.7 : 0.9}
        translationSnap={snapEnabled ? gridStep : null}
        rotationSnap={snapEnabled ? ROTATION_SNAP : null}
        onMouseDown={start}
        onObjectChange={follow}
        onMouseUp={commit}
      />
    </>
  )
}
