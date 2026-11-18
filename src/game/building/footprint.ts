/**
 * Splits the outline of a room into rectangles, so each can get its own roof.
 * Pure data: boxes in, rectangles out. A room is whatever the walls enclose,
 * walls included; walls are rasterized on a fine grid, the outside is flooded
 * from the border, and what is left is cut into rectangles.
 */

export interface Rect {
  x0: number
  x1: number
  z0: number
  z1: number
}

export interface Decomposition {
  rects: Rect[]
  /** True when the walls enclose something (an open line of walls does not). */
  enclosed: boolean
  /** Whether a point is inside the footprint (walls or room). */
  covers: (x: number, z: number) => boolean
}

const CELL = 0.1

export function boundsOf(boxes: readonly Rect[]): Rect {
  return {
    x0: Math.min(...boxes.map((b) => b.x0)),
    x1: Math.max(...boxes.map((b) => b.x1)),
    z0: Math.min(...boxes.map((b) => b.z0)),
    z1: Math.max(...boxes.map((b) => b.z1)),
  }
}

export function decomposeFootprint(boxes: readonly Rect[], cell = CELL): Decomposition {
  const bounds = boundsOf(boxes)
  const minX = bounds.x0 - cell
  const minZ = bounds.z0 - cell
  const nx = Math.ceil((bounds.x1 - bounds.x0) / cell) + 3
  const nz = Math.ceil((bounds.z1 - bounds.z0) / cell) + 3
  const blocked = new Uint8Array(nx * nz)
  for (const box of boxes) {
    for (let iz = 0; iz < nz; iz++) {
      const z = minZ + (iz + 0.5) * cell
      if (z < box.z0 || z > box.z1) continue
      for (let ix = 0; ix < nx; ix++) {
        const x = minX + (ix + 0.5) * cell
        if (x >= box.x0 && x <= box.x1) blocked[iz * nx + ix] = 1
      }
    }
  }

  // Flood the outside from the corner of the padded grid.
  const outside = new Uint8Array(nx * nz)
  const queue: number[] = [0]
  outside[0] = 1
  while (queue.length > 0) {
    const at = queue.pop()!
    const ix = at % nx
    const iz = (at - ix) / nx
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const jx = ix + dx
      const jz = iz + dz
      if (jx < 0 || jz < 0 || jx >= nx || jz >= nz) continue
      const j = jz * nx + jx
      if (outside[j] || blocked[j]) continue
      outside[j] = 1
      queue.push(j)
    }
  }
  const inside = (ix: number, iz: number) => ix >= 0 && iz >= 0 && ix < nx && iz < nz && !outside[iz * nx + ix]
  let enclosedCells = 0
  for (let i = 0; i < nx * nz; i++) if (!outside[i] && !blocked[i]) enclosedCells++

  const covers = (x: number, z: number) => inside(Math.floor((x - minX) / cell), Math.floor((z - minZ) / cell))
  if (enclosedCells === 0) return { rects: [bounds], enclosed: false, covers }

  const toRect = (a: number, b: number, c: number, d: number, byRows: boolean): Rect =>
    byRows
      ? { x0: minX + a * cell, x1: minX + b * cell, z0: minZ + c * cell, z1: minZ + d * cell }
      : { z0: minZ + a * cell, z1: minZ + b * cell, x0: minX + c * cell, x1: minX + d * cell }

  /** Cuts the footprint into strips along rows (or columns), merging neighbouring strips that have the same shape. */
  const strips = (byRows: boolean): Rect[] => {
    const lines = byRows ? nz : nx
    const length = byRows ? nx : nz
    const runsOf = (line: number): [number, number][] => {
      const runs: [number, number][] = []
      let start = -1
      for (let k = 0; k <= length; k++) {
        const on = k < length && (byRows ? inside(k, line) : inside(line, k))
        if (on && start < 0) start = k
        if (!on && start >= 0) {
          runs.push([start, k])
          start = -1
        }
      }
      return runs
    }
    const rects: Rect[] = []
    let from = 0
    let signature = ''
    let runs: [number, number][] = []
    const flush = (to: number) => {
      for (const [a, b] of runs) rects.push(toRect(a, b, from, to, byRows))
    }
    for (let line = 0; line <= lines; line++) {
      const current = line < lines ? runsOf(line) : []
      const key = JSON.stringify(current)
      if (line === 0 || key !== signature) {
        if (line > 0) flush(line)
        from = line
        signature = key
        runs = current
      }
    }
    return rects
  }

  const area = (r: Rect) => (r.x1 - r.x0) * (r.z1 - r.z0)
  const byRows = strips(true)
  const byColumns = strips(false)
  // Prefer the cut with fewer pieces, then the one with the largest single piece.
  const better =
    byRows.length !== byColumns.length
      ? byRows.length < byColumns.length ? byRows : byColumns
      : Math.max(...byRows.map(area)) >= Math.max(...byColumns.map(area)) ? byRows : byColumns
  return { rects: better, enclosed: true, covers }
}
