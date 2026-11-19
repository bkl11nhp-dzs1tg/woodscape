import type { GeometryParams, Paint, Vec3 } from '../../types/world'
import type { DrawnPart } from './drawing'

/**
 * Architectural detail for the neoclassical villa: string courses, pilasters, a porch and balconies with
 * balustrades, an arched entrance, a roof terrace with a pergola, and a gate wall with hedge. Pure data in
 * plan coordinates: x, z in meters around the middle of the plot (front of the house toward +Z) and y
 * measured up from the house's ground level. The builder places, turns and raises each group as a step.
 */

export interface DetailGroup {
  label: string
  parts: DrawnPart[]
  /** Pieces that rise from the ground (walls, pillars) rather than pop out. */
  rise?: boolean
  /** Built after the roof is on. */
  late?: boolean
}

const WHITE = 'plaster_white'
const STONE = 'plaster_white'
const WALL_STONE = 'concrete_painted'
const DARK = 'metal_dark'
const WOOD = 'walnut_painted'
// A light tint only: the plaster picture itself should show.
const CREAM: Paint = { color: '#fff6e4', strength: 0.12 }

const r3 = (value: number) => Math.round(value * 1000) / 1000

function box(name: string, materialId: string, x: number, y: number, z: number, w: number, h: number, d: number, paint?: Paint, ry = 0): DrawnPart {
  return { type: 'detail', name, geometry: { shape: 'box', width: r3(w), height: r3(h), depth: r3(d) }, position: [r3(x), r3(y), r3(z)], rotation: [0, ry, 0], materialId, paint }
}

function post(name: string, materialId: string, x: number, y: number, z: number, radius: number, height: number, paint?: Paint): DrawnPart {
  return { type: 'detail', name, geometry: { shape: 'cylinder', radius, height: r3(height) }, position: [r3(x), r3(y + height / 2), r3(z)], rotation: [0, 0, 0], materialId, paint }
}

/** A clipped hedge: a straight, square-cut run of leaves (a box with leaf texture), standing on a wall. */
function hedge(name: string, x0: number, z0: number, x1: number, z1: number, y: number): DrawnPart {
  const alongX = Math.abs(z1 - z0) < 1e-6
  const length = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0)
  return box(name, 'hedge_leaves', (x0 + x1) / 2, y + 0.5, (z0 + z1) / 2, alongX ? length : 0.6, 1, alongX ? 0.6 : length)
}

function outlineSegments(outline: [number, number][]): { a: [number, number]; b: [number, number] }[] {
  return outline.map((a, i) => ({ a, b: outline[(i + 1) % outline.length] }))
}

/** A belt of trim round a closed outline: one thin box per straight run, a little proud of the wall. */
function belt(name: string, outline: [number, number][], y: number, height: number, proud: number, skip: (a: [number, number], b: [number, number]) => boolean = () => false): DrawnPart[] {
  const parts: DrawnPart[] = []
  for (const { a, b } of outlineSegments(outline)) {
    if (skip(a, b)) continue
    const alongX = Math.abs(b[1] - a[1]) < 1e-6
    const length = alongX ? Math.abs(b[0] - a[0]) : Math.abs(b[1] - a[1])
    const cx = (a[0] + b[0]) / 2
    const cz = (a[1] + b[1]) / 2
    parts.push(box(name, STONE, cx, y, cz, alongX ? length + proud : 0.24 + proud, height, alongX ? 0.24 + proud : length + proud, CREAM))
  }
  return parts
}

/** Balusters and rails along a straight edge at `y` (floor level). `alongX` edges run in X at depth `at`. */
function balustrade(prefix: string, alongX: boolean, at: number, from: number, to: number, y: number): DrawnPart[] {
  const parts: DrawnPart[] = []
  const length = to - from
  const centre = (from + to) / 2
  const place = (u: number, v: number): [number, number] => (alongX ? [u, v] : [v, u])
  const rail = (height: number, thickness: number, name: string, h: number) => {
    const [x, z] = place(centre, at)
    parts.push(box(name, WHITE, x, y + height, z, alongX ? length : thickness, h, alongX ? thickness : length, CREAM))
  }
  rail(1.02, 0.12, `${prefix} tay vịn`, 0.08)
  rail(0.14, 0.1, `${prefix} chân lan can`, 0.1)
  const count = Math.max(2, Math.floor(length / 0.18))
  for (let i = 0; i <= count; i++) {
    const [x, z] = place(from + (length * i) / count, at)
    parts.push(post(`${prefix} con tiện`, WHITE, x, y + 0.18, z, 0.035, 0.82, CREAM))
  }
  return parts
}

/** Half-circle and rectangle outline of an arched opening, in the local XY plane starting at the sill. */
function arch(halfWidth: number, spring: number, steps = 14): [number, number][] {
  const points: [number, number][] = [[-halfWidth, 0], [halfWidth, 0], [halfWidth, spring]]
  for (let i = 1; i < steps; i++) {
    const angle = (Math.PI * i) / steps
    points.push([r3(halfWidth * Math.cos(angle)), r3(spring + halfWidth * Math.sin(angle))])
  }
  points.push([-halfWidth, spring])
  return points
}

function extrude(name: string, materialId: string, outline: [number, number][], holes: [number, number][][], depth: number, x: number, y: number, z: number, paint?: Paint): DrawnPart {
  const geometry: GeometryParams = holes.length > 0 ? { shape: 'extrude', points: outline, holes, depth } : { shape: 'extrude', points: outline, depth }
  return { type: 'detail', name, geometry, position: [r3(x), r3(y), r3(z)], rotation: [0, 0, 0], materialId, paint }
}

/** Where the entrance is, so the builder can put the door in the middle of the arch. */
export const VILLA_DOOR = { x: 2.75, width: 1.6, height: 2 }

const STOREY = 3.2

export function neoclassicalDetails(): DetailGroup[] {
  const tower: [number, number][] = [[0.5, -5], [5, -5], [5, 3], [0.5, 3]]
  const lower: [number, number][] = [[-5, -5], [5, -5], [5, 3], [0.5, 3], [0.5, 2.4], [-5, 2.4]]

  // Pilasters at the corners of the front, and string courses at each floor.
  const trim: DrawnPart[] = [
    box('Trụ ốp thân tháp', STONE, 0.5, 4.8, 3.06, 0.42, 9.6, 0.42, CREAM),
    box('Trụ ốp thân tháp', STONE, 5, 4.8, 3.06, 0.42, 9.6, 0.42, CREAM),
    box('Trụ ốp cánh trái', STONE, -5, 3.1, 2.46, 0.42, 6.2, 0.42, CREAM),
    box('Trụ ốp cánh trái', STONE, 0.5, 3.1, 2.46, 0.42, 6.2, 0.42, CREAM),
    ...belt('Phào chỉ tầng 1', lower, STOREY - 0.1, 0.2, 0.2),
    ...belt('Phào chỉ tầng 2', lower, 2 * STOREY - 0.1, 0.2, 0.2),
    ...belt('Phào chỉ mái', tower, 3 * STOREY - 0.1, 0.24, 0.22),
  ]

  // Entrance: pillars carry a porch whose roof is the first balcony; an arched frame with a dark fanlight above the door.
  const porch: DrawnPart[] = [
    post('Cột hiên', WHITE, 0.95, 0, 4.7, 0.2, STOREY - 0.2, CREAM),
    post('Cột hiên', WHITE, 4.55, 0, 4.7, 0.2, STOREY - 0.2, CREAM),
    box('Sàn hiên', STONE, 2.75, 0.05, 3.95, 4.1, 0.1, 1.9, CREAM),
    box('Mái hiên', WHITE, 2.75, STOREY - 0.1, 3.95, 4.3, 0.2, 2.1, CREAM),
  ]
  const frame = extrude('Khung vòm cửa', WHITE, arch(0.96, VILLA_DOOR.height), [arch(0.8, VILLA_DOOR.height)], 0.16, VILLA_DOOR.x, 0, 3.2, CREAM)
  const fan = extrude('Ô thoáng vòm cửa', DARK, arch(0.8, 0).slice(2), [], 0.1, VILLA_DOOR.x, VILLA_DOOR.height, 3.16)

  const balconies: DrawnPart[] = [
    // Over the porch.
    ...balustrade('Ban công hiên', true, 4.9, 0.85, 4.65, STOREY),
    ...balustrade('Ban công hiên', false, 0.8, 3.1, 4.9, STOREY),
    ...balustrade('Ban công hiên', false, 4.7, 3.1, 4.9, STOREY),
    // Second floor of the tower.
    box('Sàn ban công tầng 3', WHITE, 2.75, 2 * STOREY - 0.1, 3.5, 3.4, 0.2, 1.0, CREAM),
    ...balustrade('Ban công tầng 3', true, 3.95, 1.1, 4.4, 2 * STOREY),
    ...balustrade('Ban công tầng 3', false, 1.1, 3.1, 3.95, 2 * STOREY),
    ...balustrade('Ban công tầng 3', false, 4.4, 3.1, 3.95, 2 * STOREY),
    // Left wing.
    box('Sàn ban công cánh trái', WHITE, -2.5, STOREY - 0.1, 2.8, 3, 0.2, 0.9, CREAM),
    ...balustrade('Ban công cánh trái', true, 3.2, -3.9, -1.1, STOREY),
    ...balustrade('Ban công cánh trái', false, -3.9, 2.5, 3.2, STOREY),
    ...balustrade('Ban công cánh trái', false, -1.1, 2.5, 3.2, STOREY),
  ]

  // Roof terrace on the left wing: low parapet and a pergola of dark timber.
  const roof = 2 * STOREY
  const terrace: DrawnPart[] = [
    box('Lan can sân thượng', WHITE, -2.25, roof + 0.45, 2.4, 5.5, 0.9, 0.2, CREAM),
    box('Lan can sân thượng', WHITE, -5, roof + 0.45, -1.3, 0.2, 0.9, 7.4, CREAM),
    box('Lan can sân thượng', WHITE, -2.25, roof + 0.45, -5, 5.5, 0.9, 0.2, CREAM),
    ...[[-4.5, -4.5], [-0.8, -4.5], [-4.5, -1], [-0.8, -1]].map(([x, z]) => box('Cột giàn', WOOD, x, roof + 1.2, z, 0.16, 2.4, 0.16)),
    box('Xà giàn', WOOD, -2.65, roof + 2.47, -4.5, 4.1, 0.14, 0.16),
    box('Xà giàn', WOOD, -2.65, roof + 2.47, -1, 4.1, 0.14, 0.16),
    ...Array.from({ length: 10 }, (_, i) => box('Thanh giàn', WOOD, -4.4 + i * 0.42, roof + 2.58, -2.75, 0.07, 0.1, 4.0)),
  ]

  // Gate wall across the front with a hedge on top, gate pillars and the palms beside them.
  const gate: DrawnPart[] = [
    box('Tường rào', WALL_STONE, -5, 0.45, 9, 6.2, 0.9, 0.26, CREAM),
    box('Tường rào', WALL_STONE, 5, 0.45, 9, 6.2, 0.9, 0.26, CREAM),
    hedge('Hàng cây xén', -8, 9, -2.1, 9, 0.9),
    hedge('Hàng cây xén', 2.1, 9, 8, 9, 0.9),
    box('Tường rào bên', WALL_STONE, -8.1, 0.45, 1.25, 0.26, 0.9, 15.5, CREAM),
    box('Tường rào bên', WALL_STONE, 8.1, 0.45, 1.25, 0.26, 0.9, 15.5, CREAM),
    hedge('Hàng cây xén', -8, -6.5, 8, -6.5, 0.9),
    hedge('Hàng cây xén', -8.1, -6.4, -8.1, 9, 0.9),
    hedge('Hàng cây xén', 8.1, -6.4, 8.1, 9, 0.9),
    box('Tường rào sau', WALL_STONE, 0, 0.45, -6.5, 16.2, 0.9, 0.26, CREAM),
    ...[-1.7, 1.7].flatMap((x) => [box('Trụ cổng', STONE, x, 1.05, 9, 0.55, 2.1, 0.55, CREAM), box('Mũ trụ cổng', WHITE, x, 2.16, 9, 0.75, 0.14, 0.75, CREAM)]),
  ]

  return [
    { label: 'Ốp trụ và phào chỉ', parts: trim, rise: true },
    { label: 'Dựng hiên và vòm cửa', parts: [...porch, frame, fan] },
    { label: 'Làm ban công', parts: balconies },
    { label: 'Làm sân thượng', parts: terrace },
    { label: 'Dựng cổng rào', parts: gate, rise: true, late: true },
  ]
}

export type { Vec3 }
