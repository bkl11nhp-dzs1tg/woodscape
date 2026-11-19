import { createObjectFromPreset, getShapePreset } from '../../data/shapePresets'
import { useConstructionStore } from '../../stores/constructionStore'
import { useEditorStore } from '../../stores/editorStore'
import { showToast } from '../../stores/toastStore'
import { useWorldStore } from '../../stores/worldStore'
import type { WorldObject } from '../../types/world'
import { mergeCommands, useHistoryStore, type Command } from '../core/history'
import { getTerrainHeight } from '../environment/terrain'
import { addObjects, createObjectId, groupObjects, paintObjects } from './commands'
import { addOpeningsToSelection, addRoofToSelection, toObjects } from './drawActions'
import { buildDrawnParts, DRAW_DEFAULTS, type DrawnPart, type Pt } from './drawing'
import { startGrowth } from './growth'
import { getHousePlan, placePoint, type HousePlan } from './housePlans'
import { fillGroundRect } from './tilingActions'
import { buildStairs, instantiateCluster } from './clusters'
import { neoclassicalDetails, type DetailGroup } from './villaDetails'

/**
 * Raises a ready-made house the way a player would: lay the floor with the fill tool, draw the walls
 * along the outline one piece at a time, add doors and windows, put the roof on, then fence and path.
 * Every step is the real command, so the pieces are ordinary editable objects, and the whole build
 * undoes in one go.
 */

/** Thickness of the slab between storeys. */
const SLAB = 0.2
/** Height and depth of one step of the inside staircase. */
const INNER_THICKNESS = 0.12
const STAIR_RISE = 0.18
const STAIR_RUN = 0.27
const PAUSE = { floor: 900, wall: 420, openings: 900, roof: 1000, extra: 380, detail: 800 }

type Rect = { x0: number; x1: number; z0: number; z1: number }

/** A floor rectangle minus a hole: up to four boxes round it. Pieces thinner than 2 cm are dropped. */
function cutHole(rect: Rect, hole: Rect): Rect[] {
  const h = { x0: Math.max(rect.x0, hole.x0), x1: Math.min(rect.x1, hole.x1), z0: Math.max(rect.z0, hole.z0), z1: Math.min(rect.z1, hole.z1) }
  if (h.x1 - h.x0 < 0.02 || h.z1 - h.z0 < 0.02) return [rect]
  return [
    { x0: rect.x0, x1: h.x0, z0: rect.z0, z1: rect.z1 },
    { x0: h.x1, x1: rect.x1, z0: rect.z0, z1: rect.z1 },
    { x0: h.x0, x1: h.x1, z0: rect.z0, z1: h.z0 },
    { x0: h.x0, x1: h.x1, z0: h.z1, z1: rect.z1 },
  ].filter((piece) => piece.x1 - piece.x0 > 0.02 && piece.z1 - piece.z0 > 0.02)
}

export function isBuilding(): boolean {
  return useConstructionStore.getState().active !== null
}

/** Houses waiting for the one being built to finish: each starts by itself, one after another. */
const queue: Array<() => void> = []

export function stopBuilding(): void {
  queue.length = 0
  if (isBuilding()) useConstructionStore.setState({ stopRequested: true, queued: 0 })
}

interface Step {
  label: string
  /** Runs the step and returns how long to wait before the next one, in ms. */
  run: () => number
}

/** Starts building `planId` with its middle at `origin` (x, z), turned by `turns` quarter turns. Returns null if it cannot start. */
export function buildHouse(
  planId: string,
  origin: Pt,
  turns: number,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<void> | null {
  const plan = getHousePlan(planId)
  if (!plan) return null
  if (isBuilding()) {
    // Another house is going up: this one is lined up behind it instead of being refused.
    return new Promise<void>((resolve) => {
      queue.push(() => void run(plan, origin, turns, wait).then(resolve))
      useConstructionStore.setState({ queued: queue.length })
      showToast(`Đã xếp "${plan.name}" vào hàng, sẽ xây ngay sau căn đang xây.`)
    })
  }
  return run(plan, origin, turns, wait)
}

async function run(plan: HousePlan, origin: Pt, turns: number, wait: (ms: number) => Promise<void>): Promise<void> {
  const world = (point: Pt) => placePoint(point, origin, turns)
  const made: string[] = []
  // The commands this house adds to the undo list. Other edits made meanwhile stay separate, so the house undoes in one step.
  const ours: Command[] = []
  const record = <T,>(fn: () => T): T => {
    const before = useHistoryStore.getState().undoStack.length
    const result = fn()
    ours.push(...useHistoryStore.getState().undoStack.slice(before))
    return result
  }

  const storeys = [
    { outline: plan.outline, floor: plan.floor, material: plan.wallMaterial },
    ...(plan.upper ?? []).map((u) => ({ outline: u.outline, floor: u.floor, material: u.wallMaterial ?? plan.wallMaterial })),
  ]
  const multi = storeys.length > 1
  const rise = plan.wallHeight + SLAB
  // A tall house stands level: walls start from the highest ground under it, and a plinth fills the gap below.
  // Sampled across the whole footprint, not just the outline: a rise in the middle must not poke through the floor.
  const sampled: number[] = []
  if (multi) {
    const xs = plan.outline.map((p) => p[0])
    const zs = plan.outline.map((p) => p[1])
    for (let x = Math.min(...xs); x <= Math.max(...xs) + 0.01; x += 0.75) {
      for (let z = Math.min(...zs); z <= Math.max(...zs) + 0.01; z += 0.75) {
        const [wx, wz] = world([x, z])
        sampled.push(getTerrainHeight(wx, wz))
      }
    }
  }
  const base = multi ? Math.max(...sampled) + 0.04 : 0
  const lowest = multi ? Math.min(...sampled) : 0

  const rectOf = (rect: { x0: number; x1: number; z0: number; z1: number }, inset = 0) => {
    const a = world([rect.x0 + inset, rect.z0 + inset])
    const b = world([rect.x1 - inset, rect.z1 - inset])
    return { x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), z0: Math.min(a[1], b[1]), z1: Math.max(a[1], b[1]) }
  }
  const slab = (name: string, rect: { x0: number; x1: number; z0: number; z1: number }, top: number, thickness: number, materialId: string): WorldObject => ({
    id: createObjectId('floor_slab'),
    type: 'floor_slab',
    name,
    materialId,
    geometry: { shape: 'box', width: Math.round((rect.x1 - rect.x0) * 1000) / 1000, height: thickness, depth: Math.round((rect.z1 - rect.z0) * 1000) / 1000 },
    transform: { position: [(rect.x0 + rect.x1) / 2, top - thickness / 2, (rect.z0 + rect.z1) / 2], rotation: [0, 0, 0] },
    locked: false,
  })

  /** Plan-space detail parts moved to where the house stands: turned with it and lifted to its ground level. */
  const toWorld = (parts: DrawnPart[]): DrawnPart[] =>
    parts.map((part) => {
      const [x, y, z] = part.position
      const [px, pz] = world([x, z])
      return { ...part, position: [px, base + y, pz], rotation: [part.rotation[0], part.rotation[1] + (turns * Math.PI) / 2, part.rotation[2]] }
    })

  // Staircases: flight f links storey f to f + 1, and the floor of storey f + 1 is open above it.
  const stairCount = Math.max(3, Math.round(rise / STAIR_RISE))
  const flights = multi ? plan.stairs ?? [] : []
  const wellFor = (k: number) => {
    const flight = flights[k - 1]
    if (!flight) return null
    // Wider than the stairs, so nobody brushes the edge of the floor while climbing.
    const margin = 0.3
    return { x0: flight.x - flight.width / 2 - margin, x1: flight.x + flight.width / 2 + margin, z0: flight.z - 0.02, z1: flight.z + stairCount * STAIR_RUN }
  }

  const steps: Step[] = []

  if (!multi) {
    steps.push({
      label: 'Lát nền',
      run: () => {
        const preset = getShapePreset(plan.floorTile)!
        for (const rect of plan.floor) {
          const area = rectOf(rect, plan.wallThickness / 2)
          const source = createObjectFromPreset(preset, createObjectId(preset.type), [0, 0, 0])
          useWorldStore.getState().applyPatch({ [source.id]: source })
          const ids = fillGroundRect(source.id, area, {
            gap: 0.002,
            pattern: plan.floorTile === 'preset_plank' ? 'bond' : 'grid',
            cutToFit: true,
            groupName: 'Nền nhà',
            transientSource: true,
          })
          if (ids.length === 0) useWorldStore.getState().applyPatch({ [source.id]: null })
          made.push(...ids)
          startGrowth(ids, { mode: 'pop', duration: 380, stagger: 14 })
        }
        return PAUSE.floor
      },
    })
  } else if (base - lowest > 0.05) {
    steps.push({
      label: 'Đổ móng',
      run: () => {
        const box = rectOf({
          x0: Math.min(...plan.outline.map((p) => p[0])),
          x1: Math.max(...plan.outline.map((p) => p[0])),
          z0: Math.min(...plan.outline.map((p) => p[1])),
          z1: Math.max(...plan.outline.map((p) => p[1])),
        })
        const plinth = slab('Móng nhà', box, base, base - lowest + 0.4, 'concrete_painted')
        addObjects([plinth], 'AddObject')
        made.push(plinth.id)
        startGrowth([plinth.id], { mode: 'rise', duration: 500 })
        return PAUSE.wall + 200
      },
    })
  }

  let topWalls: string[] = []
  storeys.forEach((storey, k) => {
    const level = multi ? base + k * rise : 0
    if (multi) {
      steps.push({
        label: k === 0 ? 'Lát sàn tầng 1' : `Đổ sàn tầng ${k + 1}`,
        run: () => {
          // A floor sits under its storey: the ground floor on the plinth, upper floors on the top of the storey below.
          const rects = (k === 0 ? storey.floor : storeys[k - 1].floor).map((rect) => rectOf(rect))
          const well = k > 0 ? wellFor(k) : null
          const hole = well ? rectOf(well) : null
          const pieces = rects.flatMap((rect) => (hole ? cutHole(rect, hole) : [rect])).map((rect, i) => slab(`Sàn tầng ${k + 1}${i > 0 ? ` (${i + 1})` : ''}`, rect, level, SLAB, 'oak_painted'))
          addObjects(pieces, 'AddObject')
          made.push(...pieces.map((piece) => piece.id))
          startGrowth(pieces.map((piece) => piece.id), { mode: 'rise', duration: 450, stagger: 120 })
          return PAUSE.floor - 300
        },
      })
    }
    const flight = flights[k - 1]
    if (multi && k > 0 && flight) {
      steps.push({
        label: `Lắp cầu thang lên tầng ${k + 1}`,
        run: () => {
          const stairs = buildStairs({ steps: stairCount, rise: rise / stairCount, run: STAIR_RUN, width: flight.width, materialId: 'oak_painted' })
          const [cx, cz] = world([flight.x, flight.z + (stairCount * STAIR_RUN) / 2])
          const placed = instantiateCluster(stairs.parts, 'Cầu thang', [cx, base + (k - 1) * rise + stairs.size[1] / 2, cz], (turns * Math.PI) / 2)
          addObjects(placed, 'AddObjects')
          made.push(...placed.map((obj) => obj.id))
          startGrowth(placed.map((obj) => obj.id), { mode: 'rise', duration: 350, stagger: 45 })
          return PAUSE.floor
        },
      })
    }
    // Walls go up one piece at a time, as if drawn point by point.
    const style = { ...DRAW_DEFAULTS.wall, height: plan.wallHeight, thickness: plan.wallThickness, materialId: storey.material }
    const ground = multi ? () => level : getTerrainHeight
    const parts = buildDrawnParts(storey.outline.map(world), true, style, ground).map((part) => ({ ...part, paint: plan.wallPaint ?? part.paint }))
    const objects = toObjects(parts, createObjectId('group'))
    const mine: string[] = []
    objects.forEach((wall, i) => {
      steps.push({
        label: multi ? `Dựng tường tầng ${k + 1}` : 'Dựng tường',
        run: () => {
          addObjects([wall], 'DrawObjects')
          mine.push(wall.id)
          made.push(wall.id)
          startGrowth([wall.id], { mode: 'rise', duration: 520 })
          return i === objects.length - 1 ? PAUSE.openings : PAUSE.wall
        },
      })
    })
    steps.push({
      label: multi ? `Lắp cửa tầng ${k + 1}` : 'Lắp cửa',
      run: () => {
        const doorWall = k === 0 && plan.door ? objects[plan.door.segment]?.id : undefined
        useEditorStore.setState({ selectedIds: [...mine] })
        if (doorWall && plan.door) {
          // An entrance in the middle of its wall, then windows on every other wall.
          addOpeningsToSelection({ door: true, windows: false, only: [doorWall], doorAt: 0, doorSize: { width: plan.door.width, height: plan.door.height } })
          const doors = useEditorStore.getState().selectedIds.filter((id) => !mine.includes(id))
          if (plan.door.paint) paintObjects(doors, plan.door.paint)
          made.push(...doors)
          startGrowth(doors, { mode: 'pop', duration: 420 })
          useEditorStore.setState({ selectedIds: [...mine] })
          addOpeningsToSelection({ door: false, exclude: [doorWall] })
        } else {
          addOpeningsToSelection({ door: k === 0 })
        }
        const added = useEditorStore.getState().selectedIds.filter((id) => !mine.includes(id) && !made.includes(id))
        made.push(...added)
        startGrowth(added, { mode: 'pop', duration: 420, stagger: 160 })
        return k === storeys.length - 1 ? PAUSE.roof : PAUSE.openings
      },
    })
    // Partition walls, each with a doorway, so the floor is divided into rooms like a real house.
    const rooms = (plan.rooms ?? []).filter((room) => (room.storey ?? 0) === k)
    if (rooms.length > 0) {
      steps.push({
        label: multi ? `Chia phòng tầng ${k + 1}` : 'Chia phòng',
        run: () => {
          const inner = { ...DRAW_DEFAULTS.wall, height: plan.wallHeight, thickness: INNER_THICKNESS, materialId: storey.material }
          for (const room of rooms) {
            const parts = buildDrawnParts(room.points.map(world), false, inner, ground).map((part) => ({ ...part, name: 'Tường ngăn phòng', paint: plan.wallPaint ?? part.paint }))
            const walls = toObjects(parts, createObjectId('group'))
            addObjects(walls, 'DrawObjects')
            made.push(...walls.map((wall) => wall.id))
            startGrowth(walls.map((wall) => wall.id), { mode: 'rise', duration: 520, stagger: 120 })
            useEditorStore.setState({ selectedIds: walls.map((wall) => wall.id) })
            addOpeningsToSelection({ door: true, windows: false, doorAt: room.doorAt ?? 0, doorSize: { width: 1, height: 2.2 } })
            const doors = useEditorStore.getState().selectedIds.filter((id) => !walls.some((wall) => wall.id === id))
            made.push(...doors)
            startGrowth(doors, { mode: 'pop', duration: 420, stagger: 160 })
          }
          return PAUSE.openings
        },
      })
    }
    if (k === storeys.length - 1) topWalls = mine
  })

  const details: DetailGroup[] = plan.details === 'neoclassical' ? neoclassicalDetails() : []
  const detailStep = (group: DetailGroup): Step => ({
    label: group.label,
    run: () => {
      const objects = toObjects(toWorld(group.parts), createObjectId('group'))
      addObjects(objects, 'AddObjects')
      made.push(...objects.map((obj) => obj.id))
      startGrowth(
        objects.map((obj) => obj.id),
        { mode: group.rise ? 'rise' : 'pop', duration: 420, stagger: Math.max(8, Math.min(45, 2400 / Math.max(1, objects.length))) },
      )
      return PAUSE.detail + Math.min(1500, objects.length * 14)
    },
  })
  for (const group of details.filter((g) => !g.late)) steps.push(detailStep(group))

  steps.push({
    label: 'Lợp mái',
    run: () => {
      useEditorStore.setState({ selectedIds: [...topWalls] })
      addRoofToSelection(plan.roof.pitch, plan.roof.kind)
      const roof = useEditorStore.getState().selectedIds
      made.push(...roof)
      startGrowth(roof, { mode: 'pop', duration: 520, stagger: 180 })
      if (plan.roofPaint) {
        const tiles = roof.filter((id) => useWorldStore.getState().objects[id]?.type === 'roof')
        paintObjects(tiles, plan.roofPaint)
      }
      return PAUSE.extra + 600
    },
  })

  for (const group of details.filter((g) => g.late)) steps.push(detailStep(group))

  for (const extra of plan.extras) {
    steps.push({
      label: extra.name,
      run: () => {
        const style = { ...DRAW_DEFAULTS[extra.kind] }
        const parts = buildDrawnParts(extra.points.map(world), extra.closed, style, getTerrainHeight)
        const objects = toObjects(parts, createObjectId('group'))
        addObjects(objects, 'DrawObjects')
        made.push(...objects.map((obj) => obj.id))
        startGrowth(
          objects.map((obj) => obj.id),
          { mode: extra.kind === 'fence' ? 'rise' : 'pop', duration: 380, stagger: 70 },
        )
        return PAUSE.extra + objects.length * 30
      },
    })
  }

  if (plan.trees && plan.trees.length > 0) {
    steps.push({
      label: 'Trồng cây',
      run: () => {
        const trees = plan.trees!.flatMap((tree) => {
          const preset = getShapePreset(tree.preset)
          if (!preset) return []
          const [x, z] = world([tree.x, tree.z])
          const height = (preset.geometry as { height?: number }).height ?? 4
          return [createObjectFromPreset(preset, createObjectId(preset.type), [x, getTerrainHeight(x, z) + height / 2, z])]
        })
        addObjects(trees, 'AddObjects')
        made.push(...trees.map((tree) => tree.id))
        startGrowth(trees.map((tree) => tree.id), { mode: 'pop', duration: 700, stagger: 250 })
        return PAUSE.extra
      },
    })
  }

  const site = { x: origin[0], z: origin[1], radius: Math.max(plan.plot[0], plan.plot[1]) / 2 }
  const report = (step: number, label: string) => useConstructionStore.setState({ active: { name: plan.name, step, total: steps.length, label, site } })
  report(0, 'Chuẩn bị')
  useConstructionStore.setState({ stopRequested: false })
  useEditorStore.setState({ selectedIds: [] })
  let stopped = false
  try {
    for (let i = 0; i < steps.length; i++) {
      if (useConstructionStore.getState().stopRequested) {
        stopped = true
        break
      }
      // Part of this house was undone: leave the rest alone. Other edits made meanwhile do not matter.
      const stack = useHistoryStore.getState().undoStack
      if (ours.length > 0 && !stack.includes(ours[ours.length - 1])) {
        stopped = true
        break
      }
      report(i + 1, steps[i].label)
      const pause = record(() => steps[i].run())
      await wait(pause)
    }
  } finally {
    const stack = useHistoryStore.getState().undoStack
    const stillOurs = ours.length > 0 && stack.includes(ours[ours.length - 1])
    if (stillOurs) {
      const present = made.filter((id) => id in useWorldStore.getState().objects)
      if (!stopped && present.length > 0) record(() => groupObjects(present, plan.name))
      mergeCommands(ours, `Build ${plan.name}`)
    }
    useConstructionStore.setState({ active: null, stopRequested: false })
    useEditorStore.setState({ selectedIds: [] })
    // Nudge the scene so settled pieces can be drawn together again.
    useWorldStore.setState((s) => ({ objects: { ...s.objects } }))
    const next = queue.shift()
    useConstructionStore.setState({ queued: queue.length })
    if (next) next()
  }
  showToast(stopped ? `Đã dừng xây "${plan.name}".` : `Đã xây xong "${plan.name}". Hoàn tác một lần là gỡ cả căn.`)
}

// Dev only: lets browser tests raise a house at once, without waiting for each step.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __woodscapeBuildHouse?: unknown }).__woodscapeBuildHouse = (id: string, x: number, z: number, turns = 0) =>
    buildHouse(id, [x, z], turns, () => Promise.resolve())
}
