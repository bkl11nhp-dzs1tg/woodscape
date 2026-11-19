// Makes the big painted textures much lighter to download (palette PNG, same size, same file name).
// Run: node tools/shrink-textures.mjs   (safe to re-run)
import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'

const files = ['stone/stone_masonry_albedo', 'stone/concrete_albedo', 'stone/plaster_white_albedo', 'tile/floor_tile_albedo', 'glass/glass_albedo', 'brick/red_brick_albedo']
for (const f of files) {
  const path = `public/assets/textures/${f}.png`
  const input = await readFile(path)
  const output = await sharp(input).png({ palette: true, quality: 82, effort: 8, compressionLevel: 9 }).toBuffer()
  if (output.length < input.length) {
    await writeFile(path, output)
    console.log(f, Math.round(input.length / 1024), 'KB ->', Math.round(output.length / 1024), 'KB')
  } else console.log(f, 'kept')
}
