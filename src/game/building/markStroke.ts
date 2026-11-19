import type { Pt } from './drawing'

/** Maths for the freehand pen of the marking tool: tidy a wobbly stroke and measure it. */

/** Total length of a polyline. */
export function strokeLength(points: readonly Pt[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
  return total
}

function distanceToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const lengthSquared = dx * dx + dz * dz
  if (lengthSquared === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / lengthSquared))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dz))
}

/** Douglas-Peucker: drops points that lie within `tolerance` of the straight line between their neighbours. */
export function simplifyStroke(points: readonly Pt[], tolerance: number): Pt[] {
  if (points.length <= 2) return [...points]
  const keep = new Array<boolean>(points.length).fill(false)
  keep[0] = keep[points.length - 1] = true
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [first, last] = stack.pop()!
    let worst = 0
    let index = -1
    for (let i = first + 1; i < last; i++) {
      const d = distanceToSegment(points[i], points[first], points[last])
      if (d > worst) {
        worst = d
        index = i
      }
    }
    if (index >= 0 && worst > tolerance) {
      keep[index] = true
      stack.push([first, index], [index, last])
    }
  }
  return points.filter((_, i) => keep[i])
}

/** A stroke whose end comes back to its start (within `gap`) encloses an area. */
export function isClosedStroke(points: readonly Pt[], gap: number): boolean {
  if (points.length < 4) return false
  const first = points[0]
  const last = points[points.length - 1]
  return Math.hypot(first[0] - last[0], first[1] - last[1]) <= gap && strokeLength(points) > gap * 4
}

/** Area of the polygon (shoelace), in square meters. */
export function polygonArea(points: readonly Pt[]): number {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const [x1, z1] = points[i]
    const [x2, z2] = points[(i + 1) % points.length]
    sum += x1 * z2 - x2 * z1
  }
  return Math.abs(sum) / 2
}
