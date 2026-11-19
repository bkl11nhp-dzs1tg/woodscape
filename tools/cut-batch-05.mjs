// Cuts the five textures of ChatGPT art batch 05 out of the collage, makes each tile seamlessly,
// and writes them where the game reads them. Run: node tools/cut-batch-05.mjs
import sharp from 'sharp'

const SOURCE = 'art_inbox/batch_05_collage.png'
const OUT = 'public/assets/textures/'
const SIZE = 1024

// Where each picture sits in the collage (x, y, width, height), found by looking for the white gaps.
async function findBoxes() {
  const { data, info } = await sharp(SOURCE).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const isWhite = (x, y) => {
    const i = (y * width + x) * 3
    return data[i] > 247 && data[i + 1] > 247 && data[i + 2] > 247
  }
  // Rows and columns that are mostly picture.
  const rowInk = Array.from({ length: height }, (_, y) => {
    let n = 0
    for (let x = 0; x < width; x += 4) if (!isWhite(x, y)) n++
    return n
  })
  const runs = (flags) => {
    const out = []
    let start = -1
    flags.forEach((on, i) => {
      if (on && start < 0) start = i
      if (!on && start >= 0) {
        if (i - start > 40) out.push([start, i])
        start = -1
      }
    })
    if (start >= 0) out.push([start, flags.length])
    return out
  }
  const bands = runs(rowInk.map((n) => n > width / 4 / 6))
  const boxes = []
  for (const [y0, y1] of bands) {
    const colInk = Array.from({ length: width }, (_, x) => {
      let n = 0
      for (let y = y0; y < y1; y += 4) if (!isWhite(x, y)) n++
      return n
    })
    for (const [x0, x1] of runs(colInk.map((n) => n > (y1 - y0) / 4 / 3))) boxes.push({ x: x0, y: y0, width: x1 - x0, height: y1 - y0 })
  }
  return boxes
}

/** Blends the picture with itself shifted by half, so left meets right and top meets bottom without a seam. */
async function makeTileable(buffer) {
  const { data, info } = await sharp(buffer).resize(SIZE, SIZE, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const n = info.width
  const out = Buffer.alloc(data.length)
  const ramp = (t) => {
    // 0 at the edge, 1 over the middle, smooth in between
    const u = Math.min(1, t / 0.28)
    return u * u * (3 - 2 * u)
  }
  for (let y = 0; y < n; y++) {
    const wy = ramp(Math.min(y, n - 1 - y) / n)
    for (let x = 0; x < n; x++) {
      const wx = ramp(Math.min(x, n - 1 - x) / n)
      const w = wx * wy
      const sx = (x + n / 2) % n
      const sy = (y + n / 2) % n
      for (let c = 0; c < 3; c++) {
        out[(y * n + x) * 3 + c] = Math.round(data[(y * n + x) * 3 + c] * w + data[(sy * n + sx) * 3 + c] * (1 - w))
      }
    }
  }
  return sharp(out, { raw: { width: n, height: n, channels: 3 } }).png().toBuffer()
}

/** Stone blocks cannot be blended (they ghost): the picture is mirrored 2 x 2, which always joins without a seam. */
async function mirrored(buffer) {
  const half = SIZE / 2
  const base = await sharp(buffer).resize(half, half, { fit: 'fill' }).removeAlpha().toBuffer()
  const flipX = await sharp(base).flop().toBuffer()
  const flipY = await sharp(base).flip().toBuffer()
  const flipBoth = await sharp(base).flip().flop().toBuffer()
  return sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: '#ffffff' } })
    .composite([
      { input: base, left: 0, top: 0 },
      { input: flipX, left: half, top: 0 },
      { input: flipY, left: 0, top: half },
      { input: flipBoth, left: half, top: half },
    ])
    .png()
    .toBuffer()
}

/** Tiles must not be blended (the grid would ghost): instead a grout line is drawn on the top and left edges, so repeats are separated like real tiles. */
async function withGroutEdges(buffer) {
  const base = await sharp(buffer).resize(SIZE, SIZE, { fit: 'fill' }).removeAlpha().toBuffer()
  const line = 7
  const grout = { create: { width: SIZE, height: line, channels: 3, background: '#d6bf9d' } }
  const groutSide = { create: { width: line, height: SIZE, channels: 3, background: '#d6bf9d' } }
  return sharp(base)
    .composite([
      { input: await sharp(grout).png().toBuffer(), left: 0, top: 0 },
      { input: await sharp(groutSide).png().toBuffer(), left: 0, top: 0 },
    ])
    .png()
    .toBuffer()
}

const boxes = await findBoxes()
console.log('found', boxes.length, 'pictures', JSON.stringify(boxes))
if (boxes.length !== 5) throw new Error('Expected 5 pictures in the collage')
// Order in the collage: stone, concrete, plaster (top row), floor tile, glass (bottom row).
const order = ['stone/stone_masonry_albedo.png', 'stone/concrete_albedo.png', 'stone/plaster_white_albedo.png', 'tile/floor_tile_albedo.png', 'glass/glass_albedo.png']
const sorted = [...boxes].sort((a, b) => (Math.abs(a.y - b.y) < 80 ? a.x - b.x : a.y - b.y))
for (let i = 0; i < 5; i++) {
  const box = sorted[i]
  // Trim a few pixels so no white edge is left.
  const trim = 4
  const crop = await sharp(SOURCE).extract({ left: box.x + trim, top: box.y + trim, width: box.width - 2 * trim, height: box.height - 2 * trim }).toBuffer()
  // Glass is a smooth gradient with reflections; seams matter little, so it is only resized.
  let finished
  if (order[i].startsWith('glass')) finished = await sharp(crop).resize(SIZE, SIZE, { fit: 'fill' }).png().toBuffer()
  else if (order[i].startsWith('tile')) finished = await withGroutEdges(crop)
  else if (order[i].startsWith('stone/stone')) finished = await mirrored(crop)
  else finished = await makeTileable(crop)
  const path = OUT + order[i]
  await sharp(finished).toFile(path)
  console.log('wrote', path)
}
