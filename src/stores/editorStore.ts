import { create } from 'zustand'
import type { TimeOfDay } from '../game/environment/timeOfDay'
import type { RoofKind } from '../game/building/roof'
import { DRAW_DEFAULTS, type DrawKind, type DrawStyle, type Pt } from '../game/building/drawing'
import type { TilePattern } from '../game/building/tiling'
import type { Guide } from '../game/building/guides'
import { deviceHints, guessLevel, loadQualityChoice, saveQualityChoice, type QualityChoice, type QualityLevel } from '../game/core/quality'
import type { LengthUnit, Vec3 } from '../types/world'

export type ToolId = 'select' | 'move' | 'rotate' | 'place' | 'cut' | 'paint' | 'mark' | 'draw' | 'fill' | 'measure'

/** `walk`: first person, look around from where you stand. `orbit`: turn around a point. */
export type CameraMode = 'orbit' | 'walk'

/** `view`: walk around as a person, nothing can be edited. `edit`: click things to change them. */
export type AppMode = 'view' | 'edit'

export type Weather = 'clear' | 'cloudy' | 'rain' | 'fog' | 'snow'

export type Axis = 'x' | 'y' | 'z'

/** A spot chosen for the object being placed, waiting to be confirmed. `sx`, `sy` are the screen position of the tap. */
export interface PlacePending {
  x: number
  y: number
  z: number
  /** Facing forced by a wall (doors and windows), or null when the player's own turn applies. */
  wallYaw: number | null
  sx: number
  sy: number
}

/** A move or turn that has been dragged but not yet confirmed (touch screens). */
export interface PendingMove {
  original: Record<string, { position: [number, number, number]; rotation: [number, number, number] }>
  proposed: { id: string; position: [number, number, number]; rotation: [number, number, number] }[]
  label: string
}

/** Fill tool: which piece to spread over the rectangle the player drags out on the ground. */
export interface GroundFill {
  sourceId: string
  gap: number
  pattern: TilePattern
  cutToFit: boolean
  groupName: string
}

export const GRID_STEPS = [0.05, 0.1, 0.25, 0.5, 1] as const

interface EditorState {
  appMode: AppMode
  activeTool: ToolId
  /** Shape preset being placed while the tool is `place`. */
  placingPresetId: string | null
  /** Placing keeps going with the same piece after each one is put down (chosen by double-clicking it on the shelf). */
  placeKeep: boolean
  shelfOpen: boolean
  settingsOpen: boolean
  cameraMode: CameraMode
  /** In walk mode, solid objects stop the camera. */
  collisionEnabled: boolean
  selectedIds: string[]
  timeOfDay: TimeOfDay
  weather: Weather
  unit: LengthUnit
  /** Movement speed in meters per second. */
  cameraSpeed: number
  /** Multiplier on how fast dragging turns the view (1 = normal). */
  lookSpeed: number
  /** Comfort: field of view in degrees, eased turning and walking, centre dot, edge darkening while moving fast. */
  fov: number
  smoothMotion: boolean
  crosshair: boolean
  speedVignette: boolean
  /** Marking and drawing keep to straight 45° lines (Shift does the same on a keyboard). */
  straightLock: boolean
  snapEnabled: boolean
  /** Grid step in meters. */
  gridStep: number
  /** Cut tool: axis to cut across and where along it (0..1 from the low end). */
  cutAxis: Axis
  cutRatio: number
  /** How the cut tool cuts: in two at a measured place, along a drawn line, or a shape cut out. */
  cutMode: 'half' | 'line' | 'shape'
  /** Points clicked on the object's face for line / shape cuts, in that face's plane. */
  cutPicks: { id: string; axis: 0 | 1 | 2; points: [number, number][] } | null
  cutShape: 'rect' | 'circle' | 'triangle'
  /** Width and height of the shape to cut out, meters. */
  cutShapeSize: [number, number]
  cutKeepPlug: boolean
  /** Paint tool. */
  paintColor: string
  paintStrength: number
  paintErase: boolean
  /** `brush` paints only where you stroke; `coat` coats the whole object touched. */
  paintMode: 'brush' | 'coat'
  /** Brush radius, meters. */
  paintSize: number
  /** Paint every connected part of the same kind, not just the one touched. */
  paintRegion: boolean
  /** Marker placed on the map. */
  waypoint: { x: number; z: number } | null
  /** Facing of the object being placed, radians. */
  placeYaw: number
  placePending: PlacePending | null
  pendingMove: PendingMove | null
  /** Touch screens: every tap on an object adds it to the selection (no Ctrl key). */
  multiSelect: boolean
  /** Draw tool: what is being drawn, its settings, and the points clicked so far (x, z). */
  drawKind: DrawKind
  drawStyles: Record<DrawKind, DrawStyle>
  drawPoints: Pt[]
  roofPitch: number
  roofKind: RoofKind
  /** Fill tool settings, and the first corner clicked so far (x, z). */
  groundFill: GroundFill | null
  fillCorner: Pt | null
  /** Alignment guides shown while dragging. */
  guides: Guide[]
  /** Graphics: what the player picked (or auto) and the level actually in use. */
  qualityChoice: QualityChoice
  qualityLevel: QualityLevel
  /** The home page, or the game itself. */
  screen: 'home' | 'game'
  /** Marking tool: straight chalk lines between clicked points, or a freehand pen. */
  markMode: 'line' | 'pen'
  /** Measure tool: up to three points picked on surfaces. */
  measurePoints: Vec3[]
  select: (id: string | null) => void
  setAppMode: (mode: AppMode) => void
  setTool: (tool: Exclude<ToolId, 'place'>) => void
  toggleShelf: () => void
  setSettingsOpen: (open: boolean) => void
  setCameraMode: (mode: CameraMode) => void
  setCollisionEnabled: (enabled: boolean) => void
  startPlacing: (presetId: string, keep?: boolean) => void
  cancel: () => void
  setTimeOfDay: (time: TimeOfDay) => void
  setWeather: (weather: Weather) => void
  setUnit: (unit: LengthUnit) => void
  setCameraSpeed: (speed: number) => void
  setLookSpeed: (speed: number) => void
  setComfort: (change: Partial<Pick<EditorState, 'fov' | 'smoothMotion' | 'crosshair' | 'speedVignette'>>) => void
  setStraightLock: (on: boolean) => void
  setSnapEnabled: (enabled: boolean) => void
  setGridStep: (step: number) => void
  setCut: (cut: { axis?: Axis; ratio?: number }) => void
  setPaint: (paint: { color?: string; strength?: number; erase?: boolean; region?: boolean; mode?: 'brush' | 'coat'; size?: number }) => void
  setWaypoint: (waypoint: { x: number; z: number } | null) => void
  rotatePlacement: (delta: number) => void
  setMultiSelect: (on: boolean) => void
  setDrawKind: (kind: DrawKind) => void
  setDrawStyle: (kind: DrawKind, change: Partial<DrawStyle>) => void
  setRoofPitch: (pitch: number) => void
  setRoofKind: (kind: RoofKind) => void
  setDrawPoints: (points: Pt[]) => void
  setMarkMode: (mode: 'line' | 'pen') => void
  setQuality: (choice: QualityChoice) => void
  /** Auto mode found the game too slow: use this level now (not saved as a choice). */
  dropQuality: (level: QualityLevel) => void
  setScreen: (screen: 'home' | 'game') => void
}

const COMFORT_KEY = 'woodscape.comfort.v1'
const COMFORT_DEFAULTS = { fov: 70, smoothMotion: true, crosshair: false, speedVignette: true }

function loadComfort(): typeof COMFORT_DEFAULTS {
  try {
    const saved = JSON.parse(localStorage.getItem(COMFORT_KEY) ?? '{}')
    return { ...COMFORT_DEFAULTS, ...saved }
  } catch {
    return COMFORT_DEFAULTS
  }
}

function saveComfort(change: Partial<typeof COMFORT_DEFAULTS>): void {
  try {
    localStorage.setItem(COMFORT_KEY, JSON.stringify({ ...loadComfort(), ...change }))
  } catch {
    /* private window: the setting just lasts for this visit */
  }
}

/** Which page the address asks for: the game at #/play (or ?play), the home page otherwise. */
export function screenFromUrl(): 'home' | 'game' {
  if (typeof window === 'undefined') return 'home'
  return /[?&]play\b/.test(window.location.search) || window.location.hash === '#/play' ? 'game' : 'home'
}

const initialChoice = loadQualityChoice()

export const useEditorStore = create<EditorState>((set) => ({
  appMode: 'view',
  activeTool: 'select',
  placingPresetId: null,
  placeKeep: false,
  shelfOpen: false,
  settingsOpen: false,
  cameraMode: 'walk',
  collisionEnabled: true,
  selectedIds: [],
  timeOfDay: 'morning',
  weather: 'clear',
  unit: 'm',
  cameraSpeed: 12,
  lookSpeed: 1,
  ...loadComfort(),
  straightLock: false,
  snapEnabled: true,
  gridStep: 0.1,
  cutAxis: 'x',
  cutRatio: 0.5,
  cutMode: 'half',
  cutPicks: null,
  cutShape: 'rect',
  cutShapeSize: [0.6, 0.6],
  cutKeepPlug: false,
  paintColor: '#f3dfa6',
  paintStrength: 0.8,
  paintErase: false,
  paintMode: 'brush',
  paintSize: 0.25,
  paintRegion: false,
  waypoint: null,
  placeYaw: 0,
  placePending: null,
  pendingMove: null,
  multiSelect: false,
  drawKind: 'wall',
  drawStyles: { ...DRAW_DEFAULTS },
  drawPoints: [],
  roofPitch: 30,
  roofKind: 'gable',
  groundFill: null,
  fillCorner: null,
  guides: [],
  qualityChoice: initialChoice,
  qualityLevel: initialChoice === 'auto' ? guessLevel(deviceHints()) : initialChoice,
  screen: screenFromUrl(),
  markMode: 'line',
  measurePoints: [],
  select: (id) => set({ selectedIds: id ? [id] : [] }),
  /** Leaving edit mode drops the selection, the active tool and every open editing panel. */
  setAppMode: (appMode) =>
    set(
      appMode === 'view'
        ? { appMode, selectedIds: [], activeTool: 'select', placingPresetId: null, placeKeep: false, placePending: null, placeYaw: 0, multiSelect: false, shelfOpen: false, cutPicks: null }
        : { appMode },
    ),
  setTool: (tool) => set({ activeTool: tool, placingPresetId: null, placeKeep: false, placePending: null, placeYaw: 0, fillCorner: null, measurePoints: [] }),
  toggleShelf: () => set((s) => ({ shelfOpen: !s.shelfOpen })),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setCollisionEnabled: (collisionEnabled) => set({ collisionEnabled }),
  startPlacing: (presetId, keep = false) =>
    set((s) => ({
      activeTool: 'place',
      placingPresetId: presetId,
      placeKeep: keep,
      placePending: null,
      placeYaw: 0,
      selectedIds: [],
      // On a small screen the shelf would cover the confirm bar and the spot being chosen.
      shelfOpen: typeof window !== 'undefined' && window.matchMedia?.('(max-height: 560px)').matches ? false : s.shelfOpen,
    })),
  /** ESC: leave the current tool first; otherwise clear the selection. */
  cancel: () =>
    set((s) =>
      s.activeTool === 'select' || s.activeTool === 'move' || s.activeTool === 'rotate'
        ? { selectedIds: [] }
        : { activeTool: 'select', placingPresetId: null, placeKeep: false, placePending: null, placeYaw: 0 },
    ),
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  setWeather: (weather) => set({ weather }),
  setUnit: (unit) => set({ unit }),
  setCameraSpeed: (cameraSpeed) => set({ cameraSpeed }),
  setLookSpeed: (lookSpeed) => set({ lookSpeed }),
  setComfort: (change) => {
    set(change)
    saveComfort(change)
  },
  setStraightLock: (straightLock) => set({ straightLock }),
  setSnapEnabled: (snapEnabled) => set({ snapEnabled }),
  setGridStep: (gridStep) => set({ gridStep }),
  setCut: (cut) => set((s) => ({ cutAxis: cut.axis ?? s.cutAxis, cutRatio: cut.ratio ?? s.cutRatio })),
  setPaint: (paint) =>
    set((s) => ({
      paintColor: paint.color ?? s.paintColor,
      paintStrength: paint.strength ?? s.paintStrength,
      paintErase: paint.erase ?? (paint.color ? false : s.paintErase),
      paintRegion: paint.region ?? s.paintRegion,
      paintMode: paint.mode ?? s.paintMode,
      paintSize: paint.size ?? s.paintSize,
    })),
  setWaypoint: (waypoint) => set({ waypoint }),
  rotatePlacement: (delta) => set((s) => ({ placeYaw: s.placeYaw + delta })),
  setMultiSelect: (multiSelect) => set({ multiSelect }),
  setDrawKind: (drawKind) => set({ drawKind, drawPoints: [] }),
  setDrawStyle: (kind, change) => set((s) => ({ drawStyles: { ...s.drawStyles, [kind]: { ...s.drawStyles[kind], ...change } } })),
  setRoofPitch: (roofPitch) => set({ roofPitch }),
  setRoofKind: (roofKind) => set({ roofKind }),
  setDrawPoints: (drawPoints) => set({ drawPoints }),
  setMarkMode: (markMode) => set({ markMode }),
  setQuality: (qualityChoice) => {
    saveQualityChoice(qualityChoice)
    set({ qualityChoice, qualityLevel: qualityChoice === 'auto' ? guessLevel(deviceHints()) : qualityChoice })
  },
  dropQuality: (qualityLevel) => set({ qualityLevel }),
  setScreen: (screen) => {
    // Entering the game moves to its own address, so a reload stays in the game and Back returns to the home page.
    if (typeof window !== 'undefined' && screenFromUrl() !== screen) {
      window.history.pushState(null, '', screen === 'game' ? `${window.location.pathname}#/play` : window.location.pathname)
    }
    set({ screen })
  },
}))
