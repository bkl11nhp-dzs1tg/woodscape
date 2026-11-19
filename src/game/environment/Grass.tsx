import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useEditorStore } from '../../stores/editorStore'
import { QUALITY } from '../core/quality'
import { createRng } from '../core/random'
import { biomeAt, flatness, getTerrainHeight, type Biome } from './terrain'

/**
 * Painted grass: a tileable blade texture for the ground (multiplied with the
 * terrain vertex colors) plus instanced 2D tuft and flower cards on the plain.
 * All generated in code; replaceable by painted art later.
 */

/** Near-white texture of small brush "blades". World size: GRASS_TILE meters. */
export const GRASS_TILE = 5

export function createGrassTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const rng = createRng(101)
  ctx.fillStyle = '#dcdcd4'
  ctx.fillRect(0, 0, size, size)

  const wrapped = (x: number, y: number, margin: number, draw: (px: number, py: number) => void) => {
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const px = x + ox
        const py = y + oy
        if (px > -margin && px < size + margin && py > -margin && py < size + margin) draw(px, py)
      }
    }
  }

  // Broad soft patches of light and shade.
  for (let i = 0; i < 70; i++) {
    const r = 60 + rng() * 130
    const light = rng() > 0.5
    const x = rng() * size
    const y = rng() * size
    wrapped(x, y, r, (px, py) => {
      const gradient = ctx.createRadialGradient(px, py, 0, px, py, r)
      gradient.addColorStop(0, light ? 'rgba(255,255,240,0.22)' : 'rgba(150,165,150,0.2)')
      gradient.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = gradient
      ctx.fillRect(px - r, py - r, r * 2, r * 2)
    })
  }

  // Thousands of short curved blade strokes.
  const tones = ['rgba(255,255,235,A)', 'rgba(255,250,205,A)', 'rgba(140,160,140,A)', 'rgba(170,185,160,A)']
  ctx.lineCap = 'round'
  for (let i = 0; i < 9000; i++) {
    const x = rng() * size
    const y = rng() * size
    const length = 9 + rng() * 15
    const lean = (rng() - 0.5) * 12
    const tone = tones[Math.floor(rng() * tones.length)].replace('A', (0.1 + rng() * 0.16).toFixed(2))
    const width = 2.2 + rng() * 2.6
    wrapped(x, y, 30, (px, py) => {
      ctx.strokeStyle = tone
      ctx.lineWidth = width
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.quadraticCurveTo(px + lean * 0.2, py - length * 0.6, px + lean, py - length)
      ctx.stroke()
    })
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 8
  return texture
}

/** Alpha-tested card texture. No mipmaps: they bleed the transparent black into dark specks far away. */
function createCardTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  return texture
}

function createTuftTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const rng = createRng(55)
  for (let i = 0; i < 11; i++) {
    const baseX = 44 + rng() * 40
    const tipX = baseX + (rng() - 0.5) * 90
    const tipY = 8 + rng() * 60
    const half = 4 + rng() * 4
    const shade = 205 + Math.floor(rng() * 50)
    ctx.fillStyle = `rgb(${shade},${shade},${shade - 15})`
    ctx.beginPath()
    ctx.moveTo(baseX - half, 128)
    ctx.quadraticCurveTo(baseX - half * 0.4, 70, tipX, tipY)
    ctx.quadraticCurveTo(baseX + half, 70, baseX + half, 128)
    ctx.fill()
  }
  return createCardTexture(canvas)
}

function createFlowerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const rng = createRng(77)
  for (let i = 0; i < 5; i++) {
    const x = 20 + rng() * 88
    const y = 16 + rng() * 60
    ctx.strokeStyle = 'rgba(150,190,120,1)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(64 + (x - 64) * 0.4, 128)
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 5.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#e8c860'
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
  }
  return createCardTexture(canvas)
}

/** Two crossed upright quads, pivot at the base, normals up so cards are lit like the ground. */
function createCardGeometry(): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  const quads: [number, number][] = [
    [1, 0],
    [0, 1],
  ]
  quads.forEach(([dx, dz], q) => {
    const corners: [number, number][] = [
      [-0.5, 0],
      [0.5, 0],
      [0.5, 1],
      [-0.5, 1],
    ]
    for (const [s, y] of corners) {
      positions.push(s * dx, y, s * dz)
      uvs.push(s + 0.5, y)
      normals.push(0, 1, 0)
    }
    const o = q * 4
    // Both windings share the upward normal, so the back of a card is lit like its front.
    indices.push(o, o + 1, o + 2, o, o + 2, o + 3, o, o + 2, o + 1, o, o + 3, o + 2)
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setIndex(indices)
  return geometry
}

interface Card {
  x: number
  y: number
  z: number
  width: number
  height: number
  rotation: number
  color: string
}

const TUFT_GREENS = ['#b4e27a', '#9bd867', '#c4e98a', '#8ccc5e']
const FLOWER_TINTS = ['#ffffff', '#ffe98a', '#ffc4d6', '#d9d0ff']

const ZONE_TUFTS: Partial<Record<Biome, { keep: number; colors: string[]; height: [number, number]; width: [number, number] }>> = {
  // Meadow grass.
  plain: { keep: 1, colors: TUFT_GREENS, height: [0.22, 0.3], width: [0.45, 0.35] },
  // Sparse, darker fern-like tufts in the shade of the trees.
  forest: { keep: 0.45, colors: ['#6fa84e', '#5f9a48', '#7fb35a'], height: [0.3, 0.35], width: [0.5, 0.4] },
  // Pale dune grass on the sand.
  beach: { keep: 0.5, colors: ['#d6d38c', '#c3c57a', '#e0dc9c'], height: [0.3, 0.3], width: [0.35, 0.25] },
  // Tall reeds along the river.
  riverbank: { keep: 0.9, colors: ['#9fbf5a', '#8aae4c', '#b4c86a'], height: [0.6, 0.55], width: [0.4, 0.25] },
  // Short dry grass up high.
  highland: { keep: 0.3, colors: ['#bcc47a', '#aab66a'], height: [0.16, 0.14], width: [0.4, 0.3] },
}

function scatter() {
  const rng = createRng(4242)
  const tufts: Card[] = []
  const flowers: Card[] = []
  for (let i = 0; i < 90000 && tufts.length < 14000; i++) {
    const x = -200 + rng() * 380
    const z = -230 + rng() * 460
    const pick = rng()
    const keep = rng()
    const tall = rng()
    const wide = rng()
    const rotation = rng() * Math.PI
    if (flatness(x, z) > 0.35) continue
    const zone = ZONE_TUFTS[biomeAt(x, z)]
    if (!zone || keep > zone.keep) continue
    const y = getTerrainHeight(x, z)
    if (y < 0.15) continue
    tufts.push({
      x, y, z, rotation,
      height: zone.height[0] + tall * zone.height[1],
      width: zone.width[0] + wide * zone.width[1],
      color: zone.colors[Math.floor(pick * zone.colors.length)],
    })
  }
  // Flowers grow in loose clusters, on the open plain only.
  for (let c = 0; c < 220; c++) {
    const cx = -150 + rng() * 280
    const cz = -170 + rng() * 340
    const tint = FLOWER_TINTS[Math.floor(rng() * FLOWER_TINTS.length)]
    const count = 6 + Math.floor(rng() * 14)
    for (let k = 0; k < count; k++) {
      const x = cx + (rng() - 0.5) * 9
      const z = cz + (rng() - 0.5) * 9
      const size = 0.3 + rng() * 0.2
      const rotation = rng() * Math.PI
      if (flatness(x, z) > 0.35 || biomeAt(x, z) !== 'plain') continue
      flowers.push({ x, y: getTerrainHeight(x, z), z, width: size, height: size, rotation, color: tint })
    }
  }
  return { tufts, flowers }
}

function buildCards(geometry: THREE.BufferGeometry, map: THREE.Texture, cards: Card[]): THREE.InstancedMesh {
  const material = new THREE.MeshLambertMaterial({ map, alphaTest: 0.5 })
  const mesh = new THREE.InstancedMesh(geometry, material, cards.length)
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  cards.forEach((card, i) => {
    dummy.position.set(card.x, card.y - 0.02, card.z)
    dummy.rotation.set(0, card.rotation, 0)
    dummy.scale.set(card.width, card.height, card.width)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
    mesh.setColorAt(i, color.set(card.color))
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere()
  mesh.receiveShadow = true
  // Purely decorative: never block clicks or placement.
  mesh.raycast = () => {}
  return mesh
}

export function GrassDetail() {
  const meshes = useMemo(() => {
    const share = QUALITY[useEditorStore.getState().qualityLevel].grass
    if (share <= 0) return []
    const { tufts, flowers } = scatter()
    const geometry = createCardGeometry()
    return [
      buildCards(geometry, createTuftTexture(), tufts.slice(0, Math.floor(tufts.length * share))),
      buildCards(geometry, createFlowerTexture(), flowers.slice(0, Math.floor(flowers.length * share))),
    ]
  }, [])

  useEffect(
    () => () => {
      meshes.forEach((mesh) => {
        const material = mesh.material as THREE.MeshLambertMaterial
        material.map?.dispose()
        material.dispose()
        mesh.geometry.dispose()
        mesh.dispose()
      })
    },
    [meshes],
  )

  return (
    <group>
      {meshes.map((mesh, i) => (
        <primitive key={i} object={mesh} />
      ))}
    </group>
  )
}
