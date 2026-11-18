import { useEditorStore } from '../../stores/editorStore'
import { useWorldStore } from '../../stores/worldStore'
import { worldAabb, type Aabb } from './snapping'

/** Selection rules: groups are picked as a whole, Ctrl/Shift adds, Alt reaches inside a group. */

/** Every object sharing the group of `id` (or just `id` when it is not grouped). */
export function groupMembers(id: string): string[] {
  const { objects, order } = useWorldStore.getState()
  const groupId = objects[id]?.groupId
  return groupId ? order.filter((other) => objects[other].groupId === groupId) : [id]
}

export function clickSelect(id: string, modifiers: { add: boolean; single: boolean }): void {
  const members = modifiers.single ? [id] : groupMembers(id)
  const { selectedIds: current, multiSelect } = useEditorStore.getState()
  if (!modifiers.add && !multiSelect) {
    useEditorStore.setState({ selectedIds: members })
    return
  }
  const allSelected = members.every((member) => current.includes(member))
  useEditorStore.setState({
    selectedIds: allSelected ? current.filter((other) => !members.includes(other)) : [...new Set([...current, ...members])],
  })
}

const REGION_GAP = 0.3

function near(a: Aabb, b: Aabb): boolean {
  return [0, 1, 2].every((k) => a.min[k] < b.max[k] + REGION_GAP && a.max[k] > b.min[k] - REGION_GAP)
}

/**
 * The "whole area" for the paint tool: objects of the same kind and finish as
 * `id` that touch each other in a chain (all the walls of one house, one roof…).
 */
export function connectedRegion(id: string): string[] {
  const { objects } = useWorldStore.getState()
  const seed = objects[id]
  if (!seed) return []
  const finish = (paint: typeof seed.paint) => (paint ? `${paint.color}${paint.strength}` : '')
  const candidates = Object.values(objects).filter(
    (obj) => obj.type === seed.type && obj.materialId === seed.materialId && finish(obj.paint) === finish(seed.paint),
  )
  const boxes = new Map(candidates.map((obj) => [obj.id, worldAabb(obj.geometry, obj.transform.position, obj.transform.rotation)]))
  const region = new Set([id])
  const queue = [id]
  while (queue.length > 0) {
    const box = boxes.get(queue.pop()!)!
    for (const [other, otherBox] of boxes) {
      if (!region.has(other) && near(box, otherBox)) {
        region.add(other)
        queue.push(other)
      }
    }
  }
  return [...region]
}
