import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { getMaterialDef } from '../../data/materials'
import { formatLength } from '../../services/units'
import { useEditorStore } from '../../stores/editorStore'
import { useWorldStore } from '../../stores/worldStore'
import type { GeometryParams, LengthUnit, Vec3, WorldObject } from '../../types/world'
import {
  createBoxWithHoles,
  getDimensions,
  getGeometry,
  isBoxLike,
  isOpening,
  type WallHoles,
} from '../geometry/GeometryFactory'
import { getObjectMaterials } from '../materials/MaterialFactory'
import { CardPicture } from './CardObject'
import { FigureModel } from './FigureObject'
import { ModelModel } from './ModelObject'
import { TreeModel } from './TreeObject'
import { toggleOpen } from './commands'
import { fromPlane, outlineOf, shapePoints, toPlane, type CutAxis, type Point } from './cutting'
import { clickSelect } from './selection'
import { gizmoRecentlyUsed, objectMeshes } from './interaction'
import { OpeningParts } from './OpeningParts'
import { worldAabb } from './snapping'
import { getWallHoles } from './openings'

/** Renders canonical world objects as real 3D meshes; the store stays the source of truth. */

const CLICK_DRAG_TOLERANCE = 4
const noRaycast = () => null

/** Dimension labels placed on edges of the object's bounding box (local space). */
function dimensionLabels(g: GeometryParams, unit: LengthUnit): { position: Vec3; text: string }[] {
  const { width: w, height: h, depth: d } = getDimensions(g)
  const len = (value: number) => formatLength(value, unit)
  switch (g.shape) {
    case 'sphere':
      return [{ position: [0, -h / 2, d / 2], text: `Ø ${len(w)}` }]
    case 'cylinder':
    case 'cone':
      return [
        { position: [0, -h / 2, d / 2], text: `Ø ${len(w)}` },
        { position: [w / 2, 0, d / 2], text: len(h) },
      ]
    default:
      return [
        { position: [0, -h / 2, d / 2], text: len(w) },
        { position: [w / 2, 0, d / 2], text: len(h) },
        { position: [w / 2, -h / 2, 0], text: len(d) },
      ]
  }
}

/** Outline and dimension labels of the selected object. `edges` overrides the default bounding box outline. */
function SelectionOverlay({ obj, edgesOf, labels }: { obj: WorldObject; edgesOf?: THREE.BufferGeometry; labels: boolean }) {
  const unit = useEditorStore((s) => s.unit)
  const outline = useMemo(() => {
    if (edgesOf) return new THREE.EdgesGeometry(edgesOf, 20)
    const size = getDimensions(obj.geometry)
    const box = new THREE.BoxGeometry(size.width, size.height, size.depth)
    const edges = new THREE.EdgesGeometry(box)
    box.dispose()
    return edges
  }, [edgesOf, obj.geometry])
  useEffect(() => () => outline.dispose(), [outline])

  return (
    <>
      <lineSegments geometry={outline} renderOrder={10} raycast={noRaycast}>
        <lineBasicMaterial color="#ffd36b" depthTest={false} transparent />
      </lineSegments>
      {labels &&
        dimensionLabels(obj.geometry, unit).map((label, i) => (
        <Html key={i} position={label.position} center zIndexRange={[5, 0]} className="dim-label" style={{ pointerEvents: 'none' }}>
          {label.text}
        </Html>
      ))}
    </>
  )
}

/** Click on an object: paint it, aim the cut, or select it, depending on the tool. */
function selectOnClick(obj: WorldObject) {
  return (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > CLICK_DRAG_TOLERANCE || gizmoRecentlyUsed()) return
    const editor = useEditorStore.getState()
    if (editor.appMode === 'view') {
      // Walking around: a click opens or closes a door or window, and does nothing else.
      if (obj.geometry.shape === 'door' || obj.geometry.shape === 'window') {
        e.stopPropagation()
        toggleOpen(obj.id)
      }
      return
    }
    if (editor.activeTool === 'place' || editor.activeTool === 'mark' || editor.activeTool === 'draw') return
    e.stopPropagation()
    // Painting is done by the brush (PaintBrush), which also handles sweeping.
    if (editor.activeTool === 'paint') return
    if (editor.activeTool === 'cut' && editor.selectedIds[0] === obj.id) {
      const local = e.eventObject.worldToLocal(e.point.clone())
      if (editor.cutMode === 'half') {
        // Aim the straight cut where the object was clicked.
        if (!isBoxLike(obj.geometry.shape)) return
        const size = getDimensions(obj.geometry)
        const length = { x: size.width, y: size.height, z: size.depth }[editor.cutAxis]
        editor.setCut({ ratio: THREE.MathUtils.clamp(local[editor.cutAxis] / length + 0.5, 0.02, 0.98) })
      } else if (e.face) {
        // Line and shape cuts are drawn on the face that was clicked and go straight through it.
        const n = e.face.normal
        const ax = Math.abs(n.x)
        const ay = Math.abs(n.y)
        const az = Math.abs(n.z)
        const axis: CutAxis = ax > ay && ax > az ? 0 : ay > az ? 1 : 2
        if (!outlineOf(obj, axis)) return
        const point = toPlane(axis, local)
        const picks = editor.cutPicks
        const earlier = editor.cutMode === 'line' && picks?.id === obj.id && picks.axis === axis ? picks.points : []
        useEditorStore.setState({ cutPicks: { id: obj.id, axis, points: [...earlier, point].slice(editor.cutMode === 'line' ? -2 : -1) } })
      }
      return
    }
    const native = e.nativeEvent
    clickSelect(obj.id, { add: native.shiftKey || native.ctrlKey || native.metaKey, single: native.altKey })
  }
}

const inkCache = new WeakMap<THREE.BufferGeometry, THREE.EdgesGeometry>()

/** Hard edges of a shape, drawn as thin ink lines so forms read from far away. */
function inkEdges(geometry: THREE.BufferGeometry): THREE.EdgesGeometry {
  let edges = inkCache.get(geometry)
  if (!edges) {
    edges = new THREE.EdgesGeometry(geometry, 28)
    inkCache.set(geometry, edges)
  }
  return edges
}

/** Flat ground markings and round or see-through things get no ink line. */
function hasInk(obj: WorldObject): boolean {
  return obj.type !== 'road' && obj.type !== 'mark_line' && obj.geometry.shape !== 'sphere' && obj.opacity === undefined
}

/** Red lines on the object showing the drawn cut line or the shape about to be cut out. */
function CutSketch({ obj }: { obj: WorldObject }) {
  const mode = useEditorStore((s) => s.cutMode)
  const picks = useEditorStore((s) => s.cutPicks)
  const shape = useEditorStore((s) => s.cutShape)
  const shapeSize = useEditorStore((s) => s.cutShapeSize)
  const geometry = useMemo(() => {
    if (!picks || picks.id !== obj.id) return null
    const outline = outlineOf(obj, picks.axis)
    if (!outline) return null
    const segments: [Point, Point][] = []
    if (mode === 'shape') {
      const loop = shapePoints(shape, picks.points[0], shapeSize[0], shapeSize[1])
      loop.forEach((p, i) => segments.push([p, loop[(i + 1) % loop.length]]))
    } else if (picks.points.length === 2) {
      // Show the cut running right across the piece, past the two clicked points.
      const [a, b] = picks.points
      const reach = Math.hypot(...outline.points.map((p) => Math.hypot(p[0], p[1]))) / Math.max(Math.hypot(b[0] - a[0], b[1] - a[1]), 1e-6)
      segments.push([[a[0] - (b[0] - a[0]) * reach, a[1] - (b[1] - a[1]) * reach], [b[0] + (b[0] - a[0]) * reach, b[1] + (b[1] - a[1]) * reach]])
    } else {
      const [x, y] = picks.points[0]
      segments.push([[x - 0.06, y], [x + 0.06, y]], [[x, y - 0.06], [x, y + 0.06]])
    }
    const vertices: THREE.Vector3[] = []
    for (const w of [outline.depth / 2 + 0.004, -outline.depth / 2 - 0.004]) {
      for (const [a, b] of segments) vertices.push(new THREE.Vector3(...fromPlane(picks.axis, a, w)), new THREE.Vector3(...fromPlane(picks.axis, b, w)))
    }
    return new THREE.BufferGeometry().setFromPoints(vertices)
  }, [obj, mode, picks, shape, shapeSize])
  useEffect(() => () => geometry?.dispose(), [geometry])
  if (!geometry) return null
  return (
    <lineSegments geometry={geometry} raycast={noRaycast} renderOrder={12}>
      <lineBasicMaterial color="#ff5a4d" depthTest={false} transparent />
    </lineSegments>
  )
}

/** Translucent plane showing where the cut tool will split the selected box. */
function CutPreview({ obj }: { obj: WorldObject }) {
  const axis = useEditorStore((s) => s.cutAxis)
  const ratio = useEditorStore((s) => s.cutRatio)
  const size = getDimensions(obj.geometry)
  const lengths = { x: size.width, y: size.height, z: size.depth }
  const position: Vec3 = [0, 0, 0]
  const scale: Vec3 = [size.width + 0.12, size.height + 0.12, size.depth + 0.12]
  const index = { x: 0, y: 1, z: 2 }[axis]
  position[index] = (ratio - 0.5) * lengths[axis]
  scale[index] = 0.006
  return (
    <mesh position={position} scale={scale} raycast={noRaycast} renderOrder={11}>
      <boxGeometry />
      <meshBasicMaterial color="#ff5a4d" transparent opacity={0.6} depthWrite={false} />
    </mesh>
  )
}

/** Registers the scene node so the transform gizmo can find it by object ID. */
function registerNode(id: string) {
  return (node: THREE.Object3D | null) => {
    if (!node) return
    objectMeshes.set(id, node)
    return () => {
      objectMeshes.delete(id)
    }
  }
}

function SolidObject({ obj, selected, labels, holes }: { obj: WorldObject; selected: boolean; labels: boolean; holes?: WallHoles }) {
  const cutting = useEditorStore((s) => s.activeTool === 'cut')
  const halving = useEditorStore((s) => s.cutMode === 'half')
  const alignGrain = getMaterialDef(obj.materialId).category === 'wood'
  const holesKey = holes ? JSON.stringify(holes) : ''

  // Walls with openings get their own geometry; everything else shares cached geometry.
  const holed = useMemo(() => {
    if (!holes || !isBoxLike(obj.geometry.shape)) return null
    const size = getDimensions(obj.geometry)
    return createBoxWithHoles(size.width, size.height, size.depth, alignGrain, holes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obj.geometry, alignGrain, holesKey])
  useEffect(() => () => holed?.dispose(), [holed])

  const geometry = holed ?? getGeometry(obj.geometry, alignGrain)
  const material = useMemo(
    () => getObjectMaterials(obj),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [obj.materialId, obj.faceMaterials, obj.geometry.shape, obj.paint, obj.opacity],
  )

  return (
    <mesh
      ref={registerNode(obj.id)}
      name={obj.id}
      geometry={geometry}
      material={material}
      position={obj.transform.position}
      rotation={obj.transform.rotation}
      castShadow
      receiveShadow
      onClick={selectOnClick(obj)}
    >
      {hasInk(obj) && (
        <lineSegments geometry={inkEdges(geometry)} raycast={noRaycast}>
          <lineBasicMaterial color="#3d2f22" transparent opacity={0.65} />
        </lineSegments>
      )}
      {selected && labels && <SelectionOverlay obj={obj} labels={labels} edgesOf={isBoxLike(obj.geometry.shape) ? geometry : undefined} />}
      {selected && cutting && halving && isBoxLike(obj.geometry.shape) && <CutPreview obj={obj} />}
      {selected && cutting && !halving && <CutSketch obj={obj} />}
    </mesh>
  )
}

/** Door or window: a group of parts. Double-click swings it open or shut. */
function OpeningObject({ obj, selected, labels }: { obj: WorldObject; selected: boolean; labels: boolean }) {
  const onDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    // In view mode a single click already did the job.
    if (useEditorStore.getState().appMode !== 'edit' || useEditorStore.getState().activeTool !== 'select' || obj.geometry.shape === 'opening') return
    e.stopPropagation()
    toggleOpen(obj.id)
  }
  return (
    <group
      ref={registerNode(obj.id)}
      name={obj.id}
      position={obj.transform.position}
      rotation={obj.transform.rotation}
      onClick={selectOnClick(obj)}
      onDoubleClick={onDoubleClick}
    >
      <OpeningParts obj={obj} />
      {selected && labels && <SelectionOverlay obj={obj} labels={labels} />}
    </group>
  )
}

/** An imported 3D model: an unseen box to click on, plus the model itself. */
function ImportedModel({ obj, selected, labels }: { obj: WorldObject; selected: boolean; labels: boolean }) {
  const size = getDimensions(obj.geometry)
  return (
    <group ref={registerNode(obj.id)} name={obj.id} position={obj.transform.position} rotation={obj.transform.rotation} onClick={selectOnClick(obj)}>
      <mesh>
        <boxGeometry args={[size.width, size.height, size.depth]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <ModelModel obj={obj} />
      {selected && labels && <SelectionOverlay obj={obj} labels={labels} />}
    </group>
  )
}

/** A placed tree: an unseen box to click on, plus the painted parts. */
function TreeObject({ obj, selected, labels }: { obj: WorldObject; selected: boolean; labels: boolean }) {
  const size = getDimensions(obj.geometry)
  return (
    <group ref={registerNode(obj.id)} name={obj.id} position={obj.transform.position} rotation={obj.transform.rotation} onClick={selectOnClick(obj)}>
      <mesh>
        <boxGeometry args={[size.width, size.height, size.depth]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <TreeModel obj={obj} />
      {selected && labels && <SelectionOverlay obj={obj} labels={labels} />}
    </group>
  )
}

/** Solid reference figure (person, cat, dog). */
function FigureObject({ obj, selected, labels }: { obj: WorldObject; selected: boolean; labels: boolean }) {
  return (
    <group ref={registerNode(obj.id)} name={obj.id} position={obj.transform.position} rotation={obj.transform.rotation} onClick={selectOnClick(obj)}>
      <FigureModel obj={obj} />
      {selected && labels && <SelectionOverlay obj={obj} labels={labels} />}
    </group>
  )
}

/** Reference cut-out of a person or animal (older worlds). */
function CardObject({ obj, selected, labels }: { obj: WorldObject; selected: boolean; labels: boolean }) {
  return (
    <group ref={registerNode(obj.id)} name={obj.id} position={obj.transform.position} rotation={obj.transform.rotation} onClick={selectOnClick(obj)}>
      <CardPicture obj={obj} />
      {selected && labels && <SelectionOverlay obj={obj} labels={labels} />}
    </group>
  )
}

/** One outline around a multi-object selection, in place of an outline on every part. */
function SelectionBounds({ ids }: { ids: string[] }) {
  const objects = useWorldStore((s) => s.objects)
  const box = useMemo(() => {
    const bounds = new THREE.Box3()
    for (const id of ids) {
      const obj = objects[id]
      if (!obj) continue
      const aabb = worldAabb(obj.geometry, obj.transform.position, obj.transform.rotation)
      bounds.expandByPoint(new THREE.Vector3(...aabb.min))
      bounds.expandByPoint(new THREE.Vector3(...aabb.max))
    }
    return bounds
  }, [ids, objects])
  const edges = useMemo(() => {
    const size = box.getSize(new THREE.Vector3())
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z)
    const lines = new THREE.EdgesGeometry(geometry)
    geometry.dispose()
    return lines
  }, [box])
  useEffect(() => () => edges.dispose(), [edges])
  if (box.isEmpty()) return null
  const centre = box.getCenter(new THREE.Vector3())
  return (
    <lineSegments geometry={edges} position={centre} renderOrder={10} raycast={noRaycast}>
      <lineBasicMaterial color="#ffd36b" depthTest={false} transparent />
    </lineSegments>
  )
}

export function WorldObjects() {
  const order = useWorldStore((s) => s.order)
  const objects = useWorldStore((s) => s.objects)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const holes = getWallHoles(objects)
  const single = selectedIds.length === 1

  return (
    <group name="world-objects">
      {selectedIds.length > 1 && <SelectionBounds ids={selectedIds} />}
      {order.map((id) => {
        const obj = objects[id]
        const selected = selectedIds.includes(id)
        if (obj.geometry.shape === 'model') return <ImportedModel key={id} obj={obj} selected={selected} labels={single} />
        if (obj.geometry.shape === 'tree') return <TreeObject key={id} obj={obj} selected={selected} labels={single} />
        if (obj.geometry.shape === 'figure') return <FigureObject key={id} obj={obj} selected={selected} labels={single} />
        if (obj.geometry.shape === 'card') return <CardObject key={id} obj={obj} selected={selected} labels={single} />
        return isOpening(obj.geometry.shape) ? (
          <OpeningObject key={id} obj={obj} selected={selected} labels={single} />
        ) : (
          <SolidObject key={id} obj={obj} selected={selected} labels={single} holes={holes[id]} />
        )
      })}
    </group>
  )
}
