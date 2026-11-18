// Builds the solid reference figures (people and animals) from their drawings.
//
//   node tools/build-figures.mjs
//
// For each figure, the front and side drawings give two silhouettes. A voxel is kept when it lies inside
// BOTH silhouettes (a "visual hull"), the volume is smoothed, and a surface mesh is extracted. The drawings
// themselves are later projected onto that mesh by the game (front, back and either flank), so faces,
// clothes and fur markings come from the artwork. Outputs go to public/assets/figures/.
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'

const IN = 'public/assets/references/'
const OUT = 'public/assets/figures/'
mkdirSync(OUT, { recursive: true })

// Drawing sizes in real meters (trimmed to the subject, feet on the bottom edge). Same numbers as data/references.ts.
const FIGURES = {
  person: {
    front: ['ref_person_standing', 0.442, 1.7],
    side: ['ref_person_standing_side', 0.271, 1.7],
    back: ['ref_person_standing_back', 0.477, 1.7],
  },
  // The seated drawings all share one scale: 387.7 pixels per meter.
  person_sitting: {
    front: ['ref_person_seat_front', 0.454, 1.215],
    side: ['ref_person_seat_side_right', 0.622, 1.161],
    back: ['ref_person_seat_back', 0.472, 1.176],
  },
  cat: {
    front: ['ref_cat_standing_front', 0.212, 0.588],
    side: ['ref_cat_standing', 0.64, 0.555],
    back: ['ref_cat_standing_back', 0.216, 0.591],
  },
  dog: {
    front: ['ref_dog_standing_front', 0.371, 0.864],
    side: ['ref_dog_standing', 1.058, 0.81],
    back: ['ref_dog_standing_back', 0.31, 0.864],
  },
}

// Extra silhouettes that round the body off (drawn at 45 degrees; the figure's right shoulder is nearer the camera).
const THREE_QUARTER = {
  person: { front34: ['ref_person_standing_front34', 0.41, 1.7], back34: ['ref_person_standing_back34', 0.4, 1.7] },
  person_sitting: { front34: ['ref_person_seat_front34', 0.609, 1.189], back34: ['ref_person_seat_back34', 0.624, 1.176] },
}
// Real top-down drawings, projected onto the up-facing surfaces (back, head, shoulders).
const TOP_VIEWS = {
  cat: ['ref_cat_standing_top', 1, 1],
  dog: ['ref_dog_standing_top', 1, 1],
}
// The person's top drawing is a perspective picture (huge head), so it only supplies the hair color.
const HAIR_SOURCE = { person: 'ref_person_standing_top', person_sitting: 'ref_person_seat_top' }
// Height (meters) at which the body's axis is measured in each figure: hips when standing, chest when seated.
const AXIS_HEIGHT = { person: 1.0, person_sitting: 0.85 }

const VOXELS_ALONG_LONGEST_SIDE = 110
const PAD = 4
const ISO = 0.5

async function loadView([file, w, h]) {
  const { data, info } = await sharp(IN + file + '.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, W: info.width, H: info.height, w, h, file }
}

/** Pixel column of a metric horizontal position `u` (meters from the drawing's center). */
function column(view, u) {
  return Math.floor((u / view.w + 0.5) * view.W)
}

/** Pixel row of a metric height `y` above the feet. */
function row(view, y) {
  return Math.floor((1 - y / view.h) * view.H)
}

/**
 * Where the drawing is opaque along one pixel row, as runs [start, end) of columns.
 * A row through the legs gives two runs; a row through the body gives one.
 */
function runsOf(view, py) {
  const runs = []
  if (py < 0 || py >= view.H) return runs
  let start = -1
  for (let px = 0; px <= view.W; px++) {
    const opaque = px < view.W && view.data[(py * view.W + px) * 4 + 3] > 128
    if (opaque && start < 0) start = px
    if (!opaque && start >= 0) {
      runs.push([start, px])
      start = -1
    }
  }
  return runs
}

/**
 * How far inside its silhouette run a point is, 0 at the run's center, 1 at its edge
 * (or more outside). Each run is a limb or the body seen from that side.
 */
function edgeFraction(runs, px) {
  for (const [start, end] of runs) {
    if (px >= start && px < end) return Math.abs(px + 0.5 - (start + end) / 2) / ((end - start) / 2)
  }
  return Infinity
}

/**
 * The body is rounded: a slice through a limb or a torso is treated as a
 * rounded ellipse spanning the widths the two drawings show, instead of the
 * box their shadows would make. ROUNDNESS 2 is an ellipse; higher is boxier.
 */
const ROUNDNESS = 2.4

/** Opaque, color-extended copy of a drawing: transparent pixels take the nearest drawn color, so projected edges never show a fringe. */
async function extendedTexture(view, name) {
  const scale = Math.min(1, 1024 / view.H)
  const W = Math.round(view.W * scale)
  const H = Math.round(view.H * scale)
  const { data } = await sharp(view.data, { raw: { width: view.W, height: view.H, channels: 4 } }).resize(W, H).raw().toBuffer({ resolveWithObject: true })
  const rgb = new Float32Array(W * H * 3)
  const filled = new Uint8Array(W * H)
  // Only pixels well inside the drawing seed the color: the keyed outline carries a pink fringe.
  const solid = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) solid[i] = data[i * 4 + 3] > 240 ? 1 : 0
  for (let pass = 0; pass < 3; pass++) {
    const eroded = solid.slice()
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x
      if (solid[i] && (!solid[i - 1] || !solid[i + 1] || !solid[i - W] || !solid[i + W])) eroded[i] = 0
    }
    solid.set(eroded)
  }
  for (let i = 0; i < W * H; i++) {
    if (solid[i]) {
      rgb[i * 3] = data[i * 4]
      rgb[i * 3 + 1] = data[i * 4 + 1]
      rgb[i * 3 + 2] = data[i * 4 + 2]
      filled[i] = 1
    }
  }
  for (let round = 0; round < 40; round++) {
    const next = filled.slice()
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x
        if (filled[i]) continue
        let r = 0, g = 0, b = 0, n = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
            const j = ny * W + nx
            if (filled[j]) {
              r += rgb[j * 3]; g += rgb[j * 3 + 1]; b += rgb[j * 3 + 2]; n++
            }
          }
        }
        if (n > 0) {
          rgb[i * 3] = r / n; rgb[i * 3 + 1] = g / n; rgb[i * 3 + 2] = b / n
          next[i] = 1
        }
      }
    }
    filled.set(next)
  }
  const out = Buffer.alloc(W * H * 3)
  for (let i = 0; i < W * H * 3; i++) out[i] = Math.round(rgb[i])
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png({ compressionLevel: 9 }).toFile(OUT + name + '.png')
}

function blur(field, nx, ny, nz) {
  const tmp = new Float32Array(field.length)
  const at = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? 0 : field[(k * ny + j) * nx + i])
  for (let pass = 0; pass < 2; pass++) {
    for (const [di, dj, dk] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
      for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        tmp[(k * ny + j) * nx + i] = (at(i - di, j - dj, k - dk) + 2 * at(i, j, k) + at(i + di, j + dj, k + dk)) / 4
      }
      field.set(tmp)
    }
  }
}

/** Naive surface nets: one vertex per cell the surface crosses, one quad per crossed grid edge. */
function surfaceNets(field, nx, ny, nz, toWorld) {
  const idx = (i, j, k) => (k * ny + j) * nx + i
  const cellVertex = new Int32Array(nx * ny * nz).fill(-1)
  const positions = []
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]]
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const v = corners.map(([a, b, c]) => field[idx(i + a, j + b, k + c)])
    const mask = v.reduce((m, value, n) => m | ((value >= ISO ? 1 : 0) << n), 0)
    if (mask === 0 || mask === 255) continue
    let sx = 0, sy = 0, sz = 0, count = 0
    for (const [p, q] of edges) {
      if ((v[p] >= ISO) === (v[q] >= ISO)) continue
      const t = (ISO - v[p]) / (v[q] - v[p])
      sx += corners[p][0] + (corners[q][0] - corners[p][0]) * t
      sy += corners[p][1] + (corners[q][1] - corners[p][1]) * t
      sz += corners[p][2] + (corners[q][2] - corners[p][2]) * t
      count++
    }
    cellVertex[idx(i, j, k)] = positions.length / 3
    positions.push(...toWorld(i + sx / count, j + sy / count, k + sz / count))
  }
  const indices = []
  const dims = [nx, ny, nz]
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const p = [i, j, k]
    for (let a = 0; a < 3; a++) {
      const b = (a + 1) % 3
      const c = (a + 2) % 3
      if (p[a] >= dims[a] - 1) continue
      const q = [...p]
      q[a]++
      const in0 = field[idx(...p)] >= ISO
      const in1 = field[idx(...q)] >= ISO
      if (in0 === in1) continue
      const cell = (db, dc) => {
        const base = [...p]
        base[b] -= db
        base[c] -= dc
        return cellVertex[idx(...base)]
      }
      const quad = [cell(0, 0), cell(1, 0), cell(1, 1), cell(0, 1)]
      if (quad.some((v) => v < 0)) continue
      const order = in0 ? quad : [quad[0], quad[3], quad[2], quad[1]]
      indices.push(order[0], order[1], order[2], order[0], order[2], order[3])
    }
  }
  return { positions, indices }
}

/**
 * A one-pixel-wide strip of clean colors, one per height, for surfaces that face up or down (the crown
 * of the head, shoulders, the back of a cat). Each row is the average of the drawing's solid, light
 * pixels, leaving out outlines, eyes and shadows. It is a stand-in until real top-view drawings exist.
 */
async function topStrip(view, name, crown) {
  const rows = 256
  const out = Buffer.alloc(rows * 3)
  let last = [128, 128, 128]
  // Image row 0 is the TOP of the figure (textures are flipped on upload), so walk down from the head.
  for (let r = 0; r < rows; r++) {
    const py = Math.min(view.H - 1, Math.floor((r / rows) * view.H))
    let sr = 0, sg = 0, sb = 0, n = 0
    for (let px = 0; px < view.W; px++) {
      const i = (py * view.W + px) * 4
      if (view.data[i + 3] < 250) continue
      const luma = 0.3 * view.data[i] + 0.59 * view.data[i + 1] + 0.11 * view.data[i + 2]
      if (luma < 70) continue
      sr += view.data[i]; sg += view.data[i + 1]; sb += view.data[i + 2]; n++
    }
    if (n > 20) last = [sr / n, sg / n, sb / n]
    out[r * 3] = last[0]; out[r * 3 + 1] = last[1]; out[r * 3 + 2] = last[2]
    // The crown of the head is hair: its true color comes from the top drawing, not from the face rows.
    if (crown && r / rows < 0.07) { out[r * 3] = crown[0]; out[r * 3 + 1] = crown[1]; out[r * 3 + 2] = crown[2] }
  }
  await sharp(out, { raw: { width: 1, height: rows, channels: 3 } }).png().toFile(OUT + name + '.png')
}

/** Boolean mask of the opaque pixels, grown by `radius` pixels so a 45-degree view only trims corners. */
function dilatedMask(view, radius) {
  const { W, H, data } = view
  let mask = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) mask[i] = data[i * 4 + 3] > 128 ? 1 : 0
  for (const horizontal of [true, false]) {
    const next = new Uint8Array(W * H)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let on = 0
      for (let d = -radius; d <= radius && !on; d++) {
        const px = horizontal ? x + d : x
        const py = horizontal ? y : y + d
        if (px >= 0 && py >= 0 && px < W && py < H && mask[py * W + px]) on = 1
      }
      next[y * W + x] = on
    }
    mask = next
  }
  return mask
}

/** Average color of the brown hair pixels in a drawing. */
function hairColor(view) {
  let r = 0, g = 0, b = 0, n = 0
  for (let i = 0; i < view.W * view.H; i++) {
    const R = view.data[i * 4], G = view.data[i * 4 + 1], B = view.data[i * 4 + 2]
    const luma = 0.3 * R + 0.59 * G + 0.11 * B
    if (view.data[i * 4 + 3] > 250 && R > G && G > B && R - B > 30 && luma > 55 && luma < 140) {
      r += R; g += G; b += B; n++
    }
  }
  return n > 50 ? [r / n, g / n, b / n] : null
}

const summary = {}
for (const [kind, spec] of Object.entries(FIGURES)) {
  const views = {}
  for (const [name, entry] of Object.entries(spec)) views[name] = await loadView(entry)
  const { front, side } = views
  const height = Math.max(front.h, side.h)
  const voxel = Math.max(front.w, height, side.w) / VOXELS_ALONG_LONGEST_SIDE
  const nx = Math.ceil(front.w / voxel) + PAD * 2
  const ny = Math.ceil(height / voxel) + PAD * 2
  const nz = Math.ceil(side.w / voxel) + PAD * 2
  const x = (i) => (i - nx / 2) * voxel
  const y = (j) => (j - PAD) * voxel
  const z = (k) => (k - nz / 2) * voxel

  // 45-degree silhouettes (if any): u is the horizontal screen coordinate of a point, in meters.
  const three = {}
  for (const [name, entry] of Object.entries(THREE_QUARTER[kind] ?? {})) {
    const view = await loadView(entry)
    const px = view.H / entry[2] // pixels per meter (the drawing is trimmed to the full figure height)
    const hipRuns = runsOf(view, Math.round((1 - (AXIS_HEIGHT[kind] ?? 1.0) / entry[2]) * view.H))
    const cx = hipRuns.length ? (hipRuns[0][0] + hipRuns[hipRuns.length - 1][1]) / 2 : view.W / 2
    three[name] = { view, px, cx, h: entry[2], mask: dilatedMask(view, 6) }
  }
  // Where the body's axis is, in model coordinates: the middle of the hips in the front and side drawings.
  const axisOf = (v, hipY) => {
    const runs = runsOf(v, row(v, hipY))
    return runs.length ? (((runs[0][0] + runs[runs.length - 1][1]) / 2 / v.W) - 0.5) * v.w : 0
  }
  const axisX = axisOf(front, AXIS_HEIGHT[kind] ?? 1.0)
  const axisZ = axisOf(side, AXIS_HEIGHT[kind] ?? 1.0)
  const inside34 = (t, u, cy) => {
    const c = Math.round(t.cx + u * t.px)
    const r = Math.round((1 - cy / t.h) * t.view.H)
    return c >= 0 && r >= 0 && c < t.view.W && r < t.view.H && t.mask[r * t.view.W + c] === 1
  }

  const field = new Float32Array(nx * ny * nz)
  for (let j = 0; j < ny; j++) {
    const cy = y(j + 0.5)
    // A drawing at the figure's front looks along +Z, so its horizontal axis is X; the
    // right-facing side drawing runs along Z with the figure's front at its right.
    const frontRuns = runsOf(front, row(front, cy))
    const sideRuns = runsOf(side, row(side, cy))
    if (frontRuns.length === 0 || sideRuns.length === 0) continue
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
      const fx = edgeFraction(frontRuns, column(front, x(i + 0.5)))
      const fz = edgeFraction(sideRuns, column(side, z(k + 0.5)))
      if (Math.pow(fx, ROUNDNESS) + Math.pow(fz, ROUNDNESS) > 1) continue
      if (three.front34 || three.back34) {
        const dx = x(i + 0.5) - axisX
        const dz = z(k + 0.5) - axisZ
        if (three.front34 && !inside34(three.front34, 0.7071 * (dx + dz), cy)) continue
        if (three.back34 && !inside34(three.back34, 0.7071 * (dz - dx), cy)) continue
      }
      field[(k * ny + j) * nx + i] = 1
    }
  }
  blur(field, nx, ny, nz)
  const { positions, indices } = surfaceNets(field, nx, ny, nz, (i, j, k) => [x(i + 0.5), y(j + 0.5), z(k + 0.5)])

  let min = [Infinity, Infinity, Infinity]
  let max = [-Infinity, -Infinity, -Infinity]
  for (let n = 0; n < positions.length; n += 3) for (let a = 0; a < 3; a++) {
    min[a] = Math.min(min[a], positions[n + a])
    max[a] = Math.max(max[a], positions[n + a])
  }
  // Put the feet exactly on the ground.
  const lift = min[1]
  for (let n = 1; n < positions.length; n += 3) positions[n] -= lift
  const box = { width: +(max[0] - min[0]).toFixed(3), height: +(max[1] - min[1]).toFixed(3), depth: +(max[2] - min[2]).toFixed(3) }

  const textures = {}
  for (const [name, view] of Object.entries(views)) {
    await extendedTexture(view, `figure_${kind}_${name}`)
    textures[name] = { url: `/assets/figures/figure_${kind}_${name}.png`, width: view.w, height: view.h }
  }
  let crown = null
  if (HAIR_SOURCE[kind]) crown = hairColor(await loadView([HAIR_SOURCE[kind], 1, 1]))
  await topStrip(side, `figure_${kind}_top`, crown)
  textures.top = { url: `/assets/figures/figure_${kind}_top.png`, width: 1, height: side.h }
  // A real top-down drawing, stretched over the model's footprint (its front points to the bottom of the picture).
  let topBox = null
  if (TOP_VIEWS[kind]) {
    const topView = await loadView(TOP_VIEWS[kind])
    await extendedTexture(topView, `figure_${kind}_topmap`)
    textures.topmap = { url: `/assets/figures/figure_${kind}_topmap.png`, width: 1, height: 1 }
    topBox = [+min[0].toFixed(4), +max[0].toFixed(4), +min[2].toFixed(4), +max[2].toFixed(4)]
  }
  writeFileSync(
    OUT + `figure_${kind}.json`,
    JSON.stringify({
      kind,
      box,
      topBox,
      textures,
      // Millimeters keep the file small.
      positions: positions.map((value) => Math.round(value * 1000)),
      indices,
    }),
  )
  summary[kind] = { ...box, vertices: positions.length / 3, triangles: indices.length / 3 }
}
console.log(JSON.stringify(summary, null, 1))
