import type { Paint } from '../../types/world'
import type { Pt } from './drawing'
import type { RoofKind } from './roof'

/**
 * Ready-made houses. A plan is only the drawing of a house (where the walls run, what the floor and roof are);
 * the builder raises it with the same tools a player uses: walls drawn along the outline, a floor laid by the
 * fill tool, doors and windows added automatically, a roof put on, then fence and path.
 */

export interface HousePlan {
  id: string
  name: string
  /** Closed outline of the walls, [x, z] meters around the middle of the plot, front of the house toward +Z. */
  outline: Pt[]
  /** The floor as rectangles (x0, x1, z0, z1) so an L-shaped house still gets a flat floor. */
  floor: { x0: number; x1: number; z0: number; z1: number }[]
  wallMaterial: string
  wallHeight: number
  wallThickness: number
  /** Piece the floor is laid with: a preset ID from the shelf. */
  floorTile: 'preset_plank' | 'preset_floor_tile'
  roof: { kind: RoofKind; pitch: number }
  /** Fences and paths drawn after the house stands. */
  extras: { kind: 'fence' | 'path'; points: Pt[]; closed: boolean; name: string }[]
  /** Storeys above the ground floor, lowest first. Each can be smaller than the one below (a terrace is left). */
  upper?: { outline: Pt[]; floor: { x0: number; x1: number; z0: number; z1: number }[]; wallMaterial?: string }[]
  /** Architectural detail added after the walls (see villaDetails.ts). */
  details?: 'neoclassical'
  /** The entrance: which wall of the ground floor (index in the outline) gets a door in the middle, and how big. */
  door?: { segment: number; width: number; height: number; paint?: Paint }
  wallPaint?: Paint
  roofPaint?: Paint
  /** Trees planted when the house is done: shelf preset ID and plan position. */
  trees?: { preset: string; x: number; z: number }[]
  /** Interior partition walls that divide the floor into rooms. Each is a straight wall with a door in it. */
  rooms?: { storey?: number; points: Pt[]; doorAt?: number }[]
  /** Staircases inside, rising toward +Z from `z`: the first links storey 1 to 2, the next 2 to 3 and so on. The floor above each gets a hole for it. */
  stairs?: { x: number; z: number; width: number }[]
  /** Whole plot size, for the preview box: width, depth. */
  plot: [number, number]
  /** Height of the finished house, for the preview box. */
  height: number
}

export const HOUSE_PLANS: readonly HousePlan[] = [
  {
    id: 'house_cabin',
    name: 'Nhà gỗ nhỏ',
    outline: [[-3, -2.5], [3, -2.5], [3, 2.5], [-3, 2.5]],
    floor: [{ x0: -3, x1: 3, z0: -2.5, z1: 2.5 }],
    wallMaterial: 'pine_painted',
    wallHeight: 2.6,
    wallThickness: 0.18,
    floorTile: 'preset_plank',
    roof: { kind: 'gable', pitch: 32 },
    rooms: [{ points: [[1, -2.5], [1, 2.5]], doorAt: -0.2 }],
    extras: [{ kind: 'path', points: [[0, 2.9], [0, 6.5]], closed: false, name: 'Lối vào' }],
    plot: [6.4, 10],
    height: 4.6,
  },
  {
    id: 'house_brick_l',
    name: 'Nhà gạch chữ L',
    outline: [[-5, -3], [5, -3], [5, 0], [0, 0], [0, 3], [-5, 3]],
    floor: [
      { x0: -5, x1: 5, z0: -3, z1: 0 },
      { x0: -5, x1: 0, z0: 0, z1: 3 },
    ],
    wallMaterial: 'brick_red_painted',
    wallHeight: 2.8,
    wallThickness: 0.24,
    floorTile: 'preset_floor_tile',
    roof: { kind: 'hip', pitch: 30 },
    rooms: [
      { points: [[0, -3], [0, 0]], doorAt: 0.2 },
      { points: [[-5, 0], [0, 0]], doorAt: 0 },
    ],
    extras: [{ kind: 'path', points: [[-2.5, 3.4], [-2.5, 7]], closed: false, name: 'Lối vào' }],
    plot: [10.4, 10.5],
    height: 5,
  },
  {
    id: 'house_garden',
    name: 'Nhà vườn mái bằng',
    outline: [[-3.5, -2.5], [3.5, -2.5], [3.5, 2.5], [-3.5, 2.5]],
    floor: [{ x0: -3.5, x1: 3.5, z0: -2.5, z1: 2.5 }],
    wallMaterial: 'concrete_painted',
    wallHeight: 3,
    wallThickness: 0.22,
    floorTile: 'preset_floor_tile',
    roof: { kind: 'flat', pitch: 0 },
    rooms: [{ points: [[-0.5, -2.5], [-0.5, 2.5]], doorAt: 0.2 }],
    extras: [
      // A fence round the plot with a gap in the front for the gate.
      { kind: 'fence', points: [[-1, 6.5], [-6, 6.5], [-6, -5], [6, -5], [6, 6.5], [1, 6.5]], closed: false, name: 'Hàng rào' },
      { kind: 'path', points: [[0, 2.9], [0, 6.8]], closed: false, name: 'Lối vào' },
    ],
    plot: [12.4, 12],
    height: 3.5,
  },
  {
    id: 'house_pavilion',
    name: 'Chòi nghỉ mái hông',
    outline: [[-2, -2], [2, -2], [2, 2], [-2, 2]],
    floor: [{ x0: -2, x1: 2, z0: -2, z1: 2 }],
    wallMaterial: 'cedar_painted',
    wallHeight: 2.4,
    wallThickness: 0.16,
    floorTile: 'preset_plank',
    roof: { kind: 'hip', pitch: 35 },
    extras: [],
    plot: [4.4, 4.4],
    height: 4,
  },
  {
    id: 'house_townhouse',
    name: 'Nhà phố hai tầng',
    outline: [[-3, -4], [3, -4], [3, 4], [-3, 4]],
    floor: [{ x0: -3, x1: 3, z0: -4, z1: 4 }],
    wallMaterial: 'brick_red_painted',
    wallHeight: 2.9,
    wallThickness: 0.24,
    floorTile: 'preset_plank',
    roof: { kind: 'gable', pitch: 28 },
    upper: [{ outline: [[-3, -4], [3, -4], [3, 4], [-3, 4]], floor: [{ x0: -3, x1: 3, z0: -4, z1: 4 }], wallMaterial: 'concrete_painted' }],
    stairs: [{ x: -2.1, z: -3.2, width: 1.1 }],
    rooms: [
      { storey: 0, points: [[-3, 2.8], [3, 2.8]], doorAt: 0.3 },
      { storey: 1, points: [[-3, 2.8], [3, 2.8]], doorAt: 0.3 },
    ],
    door: { segment: 2, width: 1, height: 2.4, paint: { color: '#6b4a2f', strength: 0.8 } },
    extras: [{ kind: 'path', points: [[0, 4.4], [0, 8]], closed: false, name: 'Lối vào' }],
    plot: [6.6, 12],
    height: 8.4,
  },
  {
    id: 'house_villa',
    name: 'Biệt thự tân cổ điển',
    outline: [[-5, -5], [5, -5], [5, 3], [0.5, 3], [0.5, 2.4], [-5, 2.4]],
    floor: [
      { x0: -5, x1: 5, z0: -5, z1: 2.4 },
      { x0: 0.5, x1: 5, z0: 2.4, z1: 3 },
    ],
    wallMaterial: 'plaster_white',
    wallHeight: 3,
    wallThickness: 0.26,
    floorTile: 'preset_floor_tile',
    roof: { kind: 'gable', pitch: 40 },
    upper: [
      {
        outline: [[-5, -5], [5, -5], [5, 3], [0.5, 3], [0.5, 2.4], [-5, 2.4]],
        floor: [
          { x0: -5, x1: 5, z0: -5, z1: 2.4 },
          { x0: 0.5, x1: 5, z0: 2.4, z1: 3 },
        ],
      },
      { outline: [[0.5, -5], [5, -5], [5, 3], [0.5, 3]], floor: [{ x0: 0.5, x1: 5, z0: -5, z1: 3 }] },
    ],
    stairs: [
      { x: 1.6, z: -3.9, width: 1.1 },
      { x: 4, z: -3.9, width: 1.1 },
    ],
    details: 'neoclassical',
    door: { segment: 2, width: 1.6, height: 2, paint: { color: '#34353b', strength: 0.85 } },
    roofPaint: { color: '#4c515b', strength: 0.9 },
    trees: [
      { preset: 'preset_tree_palm', x: -6.6, z: 6.2 },
      { preset: 'preset_tree_palm', x: 6.8, z: 5.4 },
      { preset: 'preset_tree_palm', x: -6.8, z: -3.5 },
      { preset: 'preset_tree_broadleaf', x: -3.4, z: 6.8 },
    ],
    rooms: [
      { storey: 0, points: [[0.5, -5], [0.5, 2.4]], doorAt: 0.38 },
      { storey: 0, points: [[-5, -1.2], [0.5, -1.2]], doorAt: 0.2 },
      { storey: 1, points: [[0.5, -5], [0.5, 2.4]], doorAt: 0.38 },
      { storey: 1, points: [[-5, -1.2], [0.5, -1.2]], doorAt: 0.2 },
      { storey: 2, points: [[0.5, 2], [5, 2]], doorAt: 0.3 },
    ],
    extras: [{ kind: 'path', points: [[2.75, 5.6], [2.75, 9.2]], closed: false, name: 'Lối vào' }],
    plot: [16.6, 16],
    height: 12,
  },
  {
    id: 'house_tube',
    name: 'Nhà ống ba tầng',
    outline: [[-2, -6], [2, -6], [2, 6], [-2, 6]],
    floor: [{ x0: -2, x1: 2, z0: -6, z1: 6 }],
    wallMaterial: 'plaster_white',
    wallHeight: 3,
    wallThickness: 0.22,
    floorTile: 'preset_floor_tile',
    roof: { kind: 'flat', pitch: 0 },
    upper: [
      { outline: [[-2, -6], [2, -6], [2, 6], [-2, 6]], floor: [{ x0: -2, x1: 2, z0: -6, z1: 6 }] },
      { outline: [[-2, -6], [2, -6], [2, 6], [-2, 6]], floor: [{ x0: -2, x1: 2, z0: -6, z1: 6 }] },
    ],
    stairs: [
      { x: -1, z: -5, width: 1 },
      { x: 1, z: -5, width: 1 },
    ],
    door: { segment: 2, width: 1.2, height: 2.4, paint: { color: '#6b4a2f', strength: 0.8 } },
    rooms: [
      { storey: 0, points: [[-2, 1.5], [2, 1.5]], doorAt: 0.25 },
      { storey: 1, points: [[-2, 1.5], [2, 1.5]], doorAt: 0.25 },
      { storey: 2, points: [[-2, 1.5], [2, 1.5]], doorAt: 0.25 },
    ],
    extras: [{ kind: 'path', points: [[0, 6.4], [0, 9.5]], closed: false, name: 'Lối vào' }],
    plot: [4.8, 16],
    height: 10.4,
  },
  {
    id: 'house_thai',
    name: 'Nhà mái Thái',
    outline: [[-4.5, -3], [4.5, -3], [4.5, 3], [-4.5, 3]],
    floor: [{ x0: -4.5, x1: 4.5, z0: -3, z1: 3 }],
    wallMaterial: 'cedar_painted',
    wallHeight: 2.6,
    wallThickness: 0.2,
    floorTile: 'preset_plank',
    roof: { kind: 'hip', pitch: 42 },
    trees: [
      { preset: 'preset_tree_broadleaf', x: -6.2, z: 4.5 },
      { preset: 'preset_tree_palm', x: 6.4, z: 4.2 },
    ],
    rooms: [
      { points: [[-1.5, -3], [-1.5, 3]], doorAt: 0.15 },
      { points: [[2.5, -3], [2.5, 3]], doorAt: -0.15 },
    ],
    door: { segment: 2, width: 1.1, height: 2.3 },
    extras: [{ kind: 'path', points: [[0, 3.4], [0, 7]], closed: false, name: 'Lối vào' }],
    plot: [13, 10.5],
    height: 5.8,
  },
]

export function getHousePlan(id: string): HousePlan | undefined {
  return HOUSE_PLANS.find((plan) => plan.id === id)
}

/** Turns plan coordinates into world ones: a quarter-turn `turns` times about the vertical axis, then moved to `origin`. */
export function placePoint(point: Pt, origin: Pt, turns: number): Pt {
  const angle = (turns * Math.PI) / 2
  const cos = Math.round(Math.cos(angle))
  const sin = Math.round(Math.sin(angle))
  return [origin[0] + point[0] * cos + point[1] * sin, origin[1] - point[0] * sin + point[1] * cos]
}

export interface HouseMetrics {
  /** Footprint of the walls along X and Z, in meters. */
  width: number
  depth: number
  /** Whole plot with fence and path. */
  plot: [number, number]
  height: number
  storeys: number
}

export function planMetrics(plan: HousePlan): HouseMetrics {
  const xs = plan.outline.map((point) => point[0])
  const zs = plan.outline.map((point) => point[1])
  return {
    width: Math.round((Math.max(...xs) - Math.min(...xs)) * 10) / 10,
    depth: Math.round((Math.max(...zs) - Math.min(...zs)) * 10) / 10,
    plot: plan.plot,
    height: plan.height,
    storeys: 1 + (plan.upper?.length ?? 0),
  }
}
