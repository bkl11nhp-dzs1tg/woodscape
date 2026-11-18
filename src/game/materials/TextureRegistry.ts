import * as THREE from 'three'
import { TEXTURES } from '../../data/materials'
import { createRng } from '../core/random'

/** Maps stable texture IDs to loaded (and shared) Three.js textures. */

const cache = new Map<string, THREE.Texture>()
const loader = new THREE.TextureLoader()

export function getTexture(id: string): THREE.Texture | null {
  const def = TEXTURES[id]
  if (!def) return null
  let texture = cache.get(id)
  if (!texture) {
    texture = def.url ? loader.load(def.url) : id === 'tex_plain' ? createPlainTexture() : createBrushTexture(7)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = 8
    // Geometry UVs are in meters.
    texture.repeat.set(1 / def.tileSize[0], 1 / def.tileSize[1])
    cache.set(id, texture)
  }
  return texture
}

/** Flat white: for materials such as glass that must show no pattern at all. */
function createPlainTexture(): THREE.DataTexture {
  const texture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
  texture.needsUpdate = true
  return texture
}

/**
 * Tileable near-white texture of soft brush strokes. Multiplied with a tint it
 * gives flat colors a hand-painted feel. Placeholder until painted art exists.
 */
export function createBrushTexture(seed: number, size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#e6e6e6'
  ctx.fillRect(0, 0, size, size)
  const rng = createRng(seed)
  for (let i = 0; i < 260; i++) {
    const x = rng() * size
    const y = rng() * size
    const length = 18 + rng() * 46
    const width = 5 + rng() * 12
    const angle = (rng() - 0.5) * 0.9
    const light = rng() > 0.45
    ctx.fillStyle = light ? `rgba(255,255,255,${0.1 + rng() * 0.14})` : `rgba(120,120,120,${0.05 + rng() * 0.09})`
    // Draw wrapped copies so the texture tiles without seams.
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        ctx.save()
        ctx.translate(x + ox, y + oy)
        ctx.rotate(angle)
        ctx.beginPath()
        ctx.ellipse(0, 0, length / 2, width / 2, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  return texture
}
