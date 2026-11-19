import { Canvas } from '@react-three/fiber'
import { QUALITY } from './quality'
import { QualityMonitor } from './QualityMonitor'
import { useEditorStore } from '../../stores/editorStore'
import { gizmoRecentlyUsed } from '../building/interaction'
import { BuildGrid, PlacementSystem } from '../building/PlacementSystem'
import { TransformGizmo } from '../building/TransformGizmo'
import { BoxSelect } from '../building/BoxSelect'
import { CenterTap } from '../building/CenterTap'
import { MeasureTool } from '../building/MeasureTool'
import { ResizeHandles } from '../building/ResizeHandles'
import { SnapGuides } from '../building/SnapGuides'
import { ConstructionDust } from '../building/ConstructionDust'
import { GrowthDriver, WorldObjects } from '../building/WorldObjects'
import { DrawTool } from '../building/DrawTool'
import { FillTool } from '../building/FillTool'
import { LongPressEdit } from '../building/LongPressEdit'
import { MarkTool } from '../building/MarkTool'
import { PaintBrush, WaypointBeacon } from '../building/ToolHelpers'
import { CameraController, START_POSITION } from '../camera/CameraController'
import { Mountains, Terrain, Water } from '../environment/CoastalValley'
import { GrassDetail } from '../environment/Grass'
import { Scenery } from '../environment/Scenery'
import { AtmosphereDriver, Lighting, Sky } from '../environment/SkyAndLight'
import { WeatherDirector } from '../environment/WeatherDirector'

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
  const level = useEditorStore((s) => s.qualityLevel)
  const quality = QUALITY[level]
  return (
    <Canvas
      shadows={quality.shadows}
      flat
      dpr={SMALL_SCREEN ? [Math.min(quality.dpr[0], 1), Math.min(quality.dpr[1], 1.5)] : quality.dpr}
      gl={{ powerPreference: 'high-performance', antialias: quality.antialias }}
      camera={{ position: START_POSITION, fov: 55, near: 0.1, far: 4000 }}
      onPointerMissed={onPointerMissed}
    >
      <QualityMonitor />
      <AtmosphereDriver />
      <WeatherDirector />
      <Sky />
      <Lighting />
      <Terrain />
      <Water />
      <Mountains />
      <Scenery key={`scenery-${level}`} />
      <GrassDetail key={`grass-${level}`} />
      <WorldObjects />
      <GrowthDriver />
      <ConstructionDust />
      <BoxSelect />
      <CenterTap />
      <ResizeHandles />
      <SnapGuides />
      <MeasureTool />
      <BuildGrid />
      <PlacementSystem />
      <MarkTool />
      <DrawTool />
      <FillTool />
      <LongPressEdit />
      <PaintBrush />
      <WaypointBeacon />
      <TransformGizmo />
      <CameraController />
    </Canvas>
  )
}
