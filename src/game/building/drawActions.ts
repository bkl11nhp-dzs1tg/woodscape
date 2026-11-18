import { useEditorStore } from '../../stores/editorStore'
import { showToast } from '../../stores/toastStore'
import { useWorldStore } from '../../stores/worldStore'
import type { WorldObject } from '../../types/world'
import { getTerrainHeight } from '../environment/terrain'
import { addObjects, createObjectId } from './commands'
import { buildDrawnParts, type DrawnPart } from './drawing'
import { planOpenings } from './autoOpenings'
import { computeWallHoles } from './openings'
import { decomposeFootprint, type Rect } from './footprint'
import { buildRoofParts, type Footprint, type RoofKind } from './roof'
import { worldAabb } from './snapping'

/** Combined footprint of some objects, or null if there is nothing to measure. */
export function footprintOf(objects: readonly WorldObject[]): Footprint | null {
  if (objects.length === 0) return null
  const box = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity, top: -Infinity }
  for (const obj of objects) {
    const aabb = worldAabb(obj.geometry, obj.transform.position, obj.transform.rotation)
    box.x0 = Math.min(box.x0, aabb.min[0])
    box.x1 = Math.max(box.x1, aabb.max[0])
    box.z0 = Math.min(box.z0, aabb.min[2])
    box.z1 = Math.max(box.z1, aabb.max[2])
    box.top = Math.max(box.top, aabb.max[1])
  }
  return box
}

function toObjects(parts: readonly DrawnPart[], groupId: string): WorldObject[] {
  return parts.map((part) => ({
    id: createObjectId(part.type),
    type: part.type,
    name: part.name,
    materialId: part.materialId,
    faceMaterials: part.faceMaterials,
    geometry: part.geometry,
    transform: { position: part.position, rotation: part.rotation },
    locked: false,
    groupId,
    paint: part.paint,
  }))
}

/**
 * Turns the points clicked so far into a wall, fence or path (one undoable
 * step, one group) and selects it. `closed` joins the last point to the first.
 */
export function finishDrawing(closed: boolean): void {
  const editor = useEditorStore.getState()
  const points = editor.drawPoints
  if (points.length < 2) {
    showToast('Bấm ít nhất hai điểm trên mặt đất để kẻ một đường.')
    return
  }
  const parts = buildDrawnParts(points, closed && points.length >= 3, editor.drawStyles[editor.drawKind], getTerrainHeight)
  if (parts.length === 0) {
    useEditorStore.setState({ drawPoints: [] })
    return
  }
  const objects = toObjects(parts, createObjectId('group'))
  addObjects(objects, 'DrawObjects')
  useEditorStore.setState({ selectedIds: objects.map((obj) => obj.id), drawPoints: [] })
  if (editor.drawKind === 'wall' && closed) showToast('Đã dựng tường. Bấm "Thêm mái tự động" ở bảng bên phải.')
}

const QUARTER_TURN = Math.PI / 2
const AXIS_TOLERANCE = (4 * Math.PI) / 180

/** True when every object is turned by a multiple of 90° about the vertical axis and not tipped. */
function allSquareOn(objects: readonly WorldObject[]): boolean {
  return objects.every((obj) => {
    const [rx, ry, rz] = obj.transform.rotation
    const turns = ry / QUARTER_TURN
    return Math.abs(rx) < AXIS_TOLERANCE && Math.abs(rz) < AXIS_TOLERANCE && Math.abs(turns - Math.round(turns)) * QUARTER_TURN < AXIS_TOLERANCE
  })
}

/**
 * Puts a roof over whatever is selected (the walls of a room). A room whose
 * walls follow the axes and enclose a space of any rectilinear shape (L, T, U…)
 * is cut into rectangles and each gets its own roof, ridge along its longer
 * side. Where two roofs meet they simply overlap, so there is never a hole;
 * a roof end that runs into another roof shows its gable above it.
 */
export function addRoofToSelection(pitch: number, kind: RoofKind = 'gable'): void {
  const { selectedIds } = useEditorStore.getState()
  const { objects } = useWorldStore.getState()
  const chosen = selectedIds.map((id) => objects[id]).filter((obj) => obj && obj.type !== 'roof')
  const box = footprintOf(chosen)
  if (!box) return
  const wall = chosen.find((obj) => obj.type === 'wall') ?? chosen[0]
  const gable = { materialId: wall.materialId, paint: wall.paint }

  let rects: Rect[] = [{ x0: box.x0, x1: box.x1, z0: box.z0, z1: box.z1 }]
  if (allSquareOn(chosen)) {
    const plan = decomposeFootprint(
      chosen.map((obj) => {
        const aabb = worldAabb(obj.geometry, obj.transform.position, obj.transform.rotation)
        return { x0: aabb.min[0], x1: aabb.max[0], z0: aabb.min[2], z1: aabb.max[2] }
      }),
    )
    // Slivers narrower than a person are leftovers of the cut, not rooms.
    const usable = plan.rects.filter((rect) => Math.min(rect.x1 - rect.x0, rect.z1 - rect.z0) >= 1)
    if (plan.enclosed && usable.length > 0) rects = usable
  }

  const parts = rects.flatMap((rect, index) => {
    const roof = buildRoofParts({ ...rect, top: box.top }, pitch, gable, kind)
    return rects.length > 1 ? roof.map((part) => ({ ...part, name: `${part.name} (khối ${index + 1})` })) : roof
  })
  const roof = toObjects(parts, createObjectId('group'))
  addObjects(roof, 'AddRoof')
  useEditorStore.setState({ selectedIds: roof.map((obj) => obj.id) })
  showToast(rects.length > 1 ? `Đã thêm mái cho ${rects.length} khối nhà. Chỉnh màu bằng công cụ Sơn.` : 'Đã thêm mái. Chỉnh màu bằng công cụ Sơn.')
}

/** Adds a front door and evenly spaced windows to the selected walls (skipping walls that already have an opening). */
export function addOpeningsToSelection(): void {
  const { selectedIds } = useEditorStore.getState()
  const { objects } = useWorldStore.getState()
  const walls = selectedIds.map((id) => objects[id]).filter(Boolean)
  const holes = computeWallHoles(Object.values(objects))
  const skip = new Set(walls.filter((wall) => (holes[wall.id]?.rects.length ?? 0) > 0).map((wall) => wall.id))
  const plans = planOpenings(walls, skip)
  if (plans.length === 0) {
    showToast('Không có bức tường nào đủ dài để thêm cửa. Chọn các bức tường của một căn phòng.')
    return
  }
  const created: WorldObject[] = plans.map((plan) => ({
    id: createObjectId(plan.kind),
    type: plan.kind,
    name: plan.kind === 'door' ? 'Cửa chính' : 'Cửa sổ',
    materialId: plan.kind === 'door' ? 'oak_painted' : 'birch_painted',
    geometry:
      plan.kind === 'door'
        ? { shape: 'door', width: plan.width, height: plan.height, thickness: 0.14, hinge: 'left' }
        : { shape: 'window', width: plan.width, height: plan.height, thickness: 0.14 },
    transform: { position: plan.position, rotation: [0, plan.yaw, 0] },
    locked: false,
    groupId: plan.groupId,
    paint: plan.kind === 'window' ? { color: '#ffffff', strength: 0.9 } : undefined,
  }))
  addObjects(created, 'AddOpenings')
  useEditorStore.setState({ selectedIds: [...selectedIds, ...created.map((obj) => obj.id)] })
  showToast(`Đã thêm ${created.filter((obj) => obj.type === 'door').length} cửa và ${created.filter((obj) => obj.type === 'window').length} cửa sổ.`)
}
