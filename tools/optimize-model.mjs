// Prepares a 3D model from an AI generator (Tripo, Meshy…) for the game.
//
//   node tools/optimize-model.mjs <file.glb> <id> "<Vietnamese name>" [--height 1.7] [--tris 15000] [--tex 1024]
//
// - removes duplicate data, welds vertices, drops unused nodes and materials
// - reduces the triangle count to about --tris (a generator's 1,000,000 vertices is far too heavy for a browser)
// - shrinks textures to at most --tex pixels and re-encodes them as WebP
// - compresses the geometry (meshopt)
// - writes public/assets/models/<id>.glb and adds the model to src/data/models.json,
//   so it shows up in the shelf under "Mô hình 3D" with no code change.
import { NodeIO } from '@gltf-transform/core'
import { EXTMeshoptCompression, EXTTextureWebP, KHRMaterialsUnlit, KHRMeshQuantization } from '@gltf-transform/extensions'
import { dedup, getBounds, meshopt, prune, resample, simplify, textureCompress, weld } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? Number(args[i + 1]) : fallback
}
const positional = args.filter((arg, i) => !arg.startsWith('--') && !args[i - 1]?.startsWith('--'))
const [input, id, name] = positional
if (!input || !id || !name) {
  console.error('Usage: node tools/optimize-model.mjs <file.glb> <id> "<name>" [--height 1.7] [--tris 15000] [--tex 1024]')
  process.exit(1)
}
if (!/^[a-z0-9_]+$/.test(id)) {
  console.error('The id may only contain lowercase letters, digits and underscores.')
  process.exit(1)
}
const targetTriangles = flag('tris', 15000)
const maxTexture = flag('tex', 1024)
const realHeight = flag('height', 0) // meters; 0 = keep the size the file already has

await MeshoptEncoder.ready
await MeshoptSimplifier.ready

const io = new NodeIO().registerExtensions([EXTMeshoptCompression, EXTTextureWebP, KHRMaterialsUnlit, KHRMeshQuantization]).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
})
const document = await io.read(input)
const root = document.getRoot()

const countTriangles = () =>
  root.listMeshes().reduce((sum, mesh) => sum + mesh.listPrimitives().reduce((s, p) => s + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0)
const before = Math.round(countTriangles())

await document.transform(
  dedup(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, targetTriangles / Math.max(before, 1)), error: 0.01, lockBorder: false }),
  resample(),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [maxTexture, maxTexture], quality: 85 }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
)
const after = Math.round(countTriangles())

// Size of the model: bounding box of the whole scene, in the file's own units (glTF is meters).
const scene = root.getDefaultScene() ?? root.listScenes()[0]
const bounds = getBounds(scene)
const size = [bounds.max[0] - bounds.min[0], bounds.max[1] - bounds.min[1], bounds.max[2] - bounds.min[2]]
const height = realHeight > 0 ? realHeight : size[1]
const k = height / size[1]
const box = { width: +(size[0] * k).toFixed(3), height: +height.toFixed(3), depth: +(size[2] * k).toFixed(3) }

mkdirSync('public/assets/models', { recursive: true })
const output = `public/assets/models/${id}.glb`
await io.write(output, document)

const registryPath = 'src/data/models.json'
const registry = existsSync(registryPath) ? JSON.parse(readFileSync(registryPath, 'utf-8')) : []
const entry = { id, name, url: `/assets/models/${id}.glb`, ...box, source: `${basename(input)} (optimized by tools/optimize-model.mjs)` }
const at = registry.findIndex((model) => model.id === id)
if (at >= 0) registry[at] = entry
else registry.push(entry)
writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n')

console.log(`${basename(input)}: ${before.toLocaleString()} -> ${after.toLocaleString()} triangles, ${(statSync(output).size / 1024).toFixed(0)} KB`)
console.log(`size in game: ${box.width} x ${box.height} x ${box.depth} m  (as exported: ${size.map((v) => v.toFixed(2)).join(' x ')})`)
console.log(`added to ${registryPath} as "${id}"`)
