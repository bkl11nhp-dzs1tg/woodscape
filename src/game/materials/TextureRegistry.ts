import * as THREE from 'three'
import { TEXTURES } from '../../data/materials'
import { createRng } from '../core/random'

/** Maps stable texture IDs to loaded (and shared) Three.js textures. */

const cache = new Map<string, THREE.Texture>()
const loader = new THREE.TextureLoader()

/**
 * A picture that is still downloading would draw solid black (slow phone connections showed black house bases),
 * so the texture starts as a plain mid-tone and takes the real picture as soon as it arrives.
 */
function loadWithPlaceholder(url: string): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 4
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#c8b9a2'
    ctx.fillRect(0, 0, 4, 4)
  }
  const texture: THREE.Texture = new THREE.Texture(canvas)
  texture.needsUpdate = true
  loader.load(url, (loaded) => {
    texture.image = loaded.image
    texture.needsUpdate = true
  })
  return texture
}

export function getTexture(id: string): THREE.Texture | null {
  const def = TEXTURES[id]
  if (!def) return null
  let texture = cache.get(id)
  if (!texture) {
    texture = def.url ? loadWithPlaceholder(def.url) : id === 'tex_plain' ? createPlainTexture() : id === 'tex_hedge' ? createHedgeTexture() : createBrushTexture(7)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = 8
    // Geometry UVs are in meters.
    texture.repeat.set(1 / def.tileSize[0], 1 / def.tileSize[1])
    cache.set(id, texture)
  }
  return texture
}

/** A clipped hedge: dense overlapping leaves in several greens, drawn wrapped so it tiles without seams. */
function createHedgeTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const rng = createRng(31)
  ctx.fillStyle = '#24562a'
  ctx.fillRect(0, 0, size, size)
  const greens = ['#2f6f33', '#3f8a3a', '#4f9c43', '#62b04c', '#78c45a', '#2a6430']
  for (let i = 0; i < 2600; i++) {
    const x = rng() * size
    const y = rng() * size
    const length = 14 + rng() * 14
    const width = length * (0.4 + rng() * 0.15)
    const angle = rng() * Math.PI
    const colour = greens[Math.floor(rng() * greens.length)]
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const px = x + ox
        const py = y + oy
        if (px < -length || px > size + length || py < -length || py > size + length) continue
        ctx.save()
        ctx.translate(px, py)
        ctx.rotate(angle)
        ctx.fillStyle = 'rgba(15,40,18,0.45)'
        ctx.beginPath()
        ctx.ellipse(1.5, 2, length / 2, width / 2, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = colour
        ctx.beginPath()
        ctx.ellipse(0, 0, length / 2, width / 2, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.14)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(-length / 2.4, 0)
        ctx.lineTo(length / 2.4, 0)
        ctx.stroke()
        ctx.restore()
      }
    }
  }
  return new THREE.CanvasTexture(canvas)
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
