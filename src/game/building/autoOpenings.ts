import type { Vec3, WorldObject } from '../../types/world'
import { getDimensions, isBoxLike } from '../geometry/GeometryFactory'

/**
 * Plans doors and windows for a set of walls (the walls of a drawn room):
 * one front door on the longest wall, and windows spaced evenly along every
 * wall that is long enough. Pure data in and out. Openings face away from the
 * middle of the walls, which for a closed room means outward.
 */

export interface OpeningPlan {
  kind: 'door' | 'window'
  position: Vec3
  yaw: number
  width: number
  height: number
  groupId?: string
}

export const DOOR = { width: 0.9, height: 2.05 }
export const WINDOW = { width: 1.1, height: 1.1, sill: 0.9 }
const MIN_WALL_LENGTH = 1.4
const MIN_WALL_HEIGHT = 1.6
const MAX_THICKNESS = 0.6
/** Walls are buried this far in the ground when drawn (see drawing.ts). */
const BURIED = 0.05

interface WallInfo {
  obj: WorldObject
  length: number
  thickness: number
  height: number
  /** Unit direction along the wall on the ground plane. */
  dir: [number, number]
}

function wallInfo(obj: WorldObject): WallInfo | null {
  if (!isBoxLike(obj.geometry.shape)) return null
  const size = getDimensions(obj.geometry)
  const alongX = size.width > size.depth
  const length = alongX ? size.width : size.depth
  const thickness = alongX ? size.depth : size.width
  if (thickness > MAX_THICKNESS || length < MIN_WALL_LENGTH || size.height < MIN_WALL_HEIGHT) return null
  const yaw = obj.transform.rotation[1]
  // Local +X after the turn about Y, or local +Z.
  const dir: [number, number] = alongX ? [Math.cos(yaw), -Math.sin(yaw)] : [Math.sin(yaw), Math.cos(yaw)]
  return { obj, length, thickness, height: size.height, dir }
}

/** `skip` lists wall IDs that already have an opening and are left alone. */
export function planOpenings(walls: readonly WorldObject[], skip: ReadonlySet<string> = new Set()): OpeningPlan[] {
  const infos = walls.map(wallInfo).filter((info): info is WallInfo => info !== null && !skip.has(info.obj.id))
  if (infos.length === 0) return []
  const all = walls.filter((obj) => isBoxLike(obj.geometry.shape))
  const cx = all.reduce((sum, obj) => sum + obj.transform.position[0], 0) / all.length
  const cz = all.reduce((sum, obj) => sum + obj.transform.position[2], 0) / all.length

  const plans: OpeningPlan[] = []
  const doorWall = infos.filter((info) => info.height >= 2.2).sort((a, b) => b.length - a.length)[0]

  for (const info of infos) {
    const [px, py, pz] = info.obj.transform.position
    // Outward normal: perpendicular to the wall, on the side away from the middle of the room.
    let normal: [number, number] = [-info.dir[1], info.dir[0]]
    const away = (px - cx) * normal[0] + (pz - cz) * normal[1]
    if (away < 0) normal = [-normal[0], -normal[1]]
    const yaw = Math.atan2(normal[0], normal[1])
    const base = py - info.height / 2 + BURIED
    const at = (u: number, y: number): Vec3 => [px + info.dir[0] * u, y, pz + info.dir[1] * u]
    const groupId = info.obj.groupId

    let doorU: number | null = null
    if (info === doorWall) {
      doorU = info.length / 4
      plans.push({ kind: 'door', position: at(doorU, base + DOOR.height / 2), yaw, width: DOOR.width, height: DOOR.height, groupId })
    }
    const count = info.length >= 1.8 ? Math.max(1, Math.floor((info.length - 0.6) / 2.2)) : 0
    for (let k = 0; k < count; k++) {
      const u = -info.length / 2 + ((k + 0.5) * info.length) / count
      if (doorU !== null && Math.abs(u - doorU) < DOOR.width / 2 + WINDOW.width / 2 + 0.3) continue
      plans.push({ kind: 'window', position: at(u, base + WINDOW.sill + WINDOW.height / 2), yaw, width: WINDOW.width, height: WINDOW.height, groupId })
    }
  }
  return plans
}
