import { Canvas } from '@react-three/fiber'
import { useEditorStore } from '../../stores/editorStore'
import { gizmoRecentlyUsed } from '../building/interaction'
import { BuildGrid, PlacementSystem } from '../building/PlacementSystem'
import { TransformGizmo } from '../building/TransformGizmo'
import { WorldObjects } from '../building/WorldObjects'
import { DrawTool } from '../building/DrawTool'
import { LongPressEdit } from '../building/LongPressEdit'
import { MarkTool } from '../building/MarkTool'
import { PaintBrush, WaypointBeacon } from '../building/ToolHelpers'
import { CameraController, START_POSITION } from '../camera/CameraController'
import { Mountains, Terrain, Water } from '../environment/CoastalValley'
import { GrassDetail } from '../environment/Grass'
import { Scenery } from '../environment/Scenery'
import { Lighting, Sky } from '../environment/SkyAndLight'

function onPointerMissed() {
  const editor = useEditorStore.getState()
  if (editor.appMode !== 'edit') return
  if (editor.activeTool !== 'select' && editor.activeTool !== 'move' && editor.activeTool !== 'rotate') return
  if (gizmoRecentlyUsed()) return
  editor.select(null)
}

/** Phones render at a lower pixel ratio so the game runs smoother. */
const SMALL_SCREEN = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 560

/** Owns the R3F canvas and composes the 3D scene. */
export function GameCanvas() {
  return (
    <Canvas
      shadows
      flat
      dpr={SMALL_SCREEN ? [1, 1.5] : [1, 2]}
      camera={{ position: START_POSITION, fov: 55, near: 0.1, far: 4000 }}
      onPointerMissed={onPointerMissed}
    >
      <Sky />
      <Lighting />
      <Terrain />
      <Water />
      <Mountains />
      <Scenery />
      <GrassDetail />
      <WorldObjects />
      <BuildGrid />
      <PlacementSystem />
      <MarkTool />
      <DrawTool />
      <LongPressEdit />
      <PaintBrush />
      <WaypointBeacon />
      <TransformGizmo />
      <CameraController />
    </Canvas>
  )
}
