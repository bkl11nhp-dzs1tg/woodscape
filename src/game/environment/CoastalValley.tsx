import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { createBrushTexture } from '../materials/TextureRegistry'
import { createGrassTexture, GRASS_TILE } from './Grass'
import {
  coastFactor,
  fbm,
  forestFactor,
  getTerrainHeight,
  hillMask,
  smoothstep,
  TERRAIN_SIZE,
  WATER_LEVEL,
} from './terrain'

const SEGMENTS = 256

const SAND = new THREE.Color('#ecdcae')
const WET_SAND = new THREE.Color('#bfae80')
const RIVERBED = new THREE.Color('#8f9a78')
const GRASS_LIGHT = new THREE.Color('#a9dc6c')
const GRASS_MID = new THREE.Color('#8acb5b')
const ROCK = new THREE.Color('#a8a092')
const FOREST_FLOOR = new THREE.Color('#4f8f45')
const HIGHLAND = new THREE.Color('#b3bd74')

function createTerrainGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, SEGMENTS, SEGMENTS)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const color = new THREE.Color()
  const step = TERRAIN_SIZE / SEGMENTS

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i)
    const h = getTerrainHeight(x, z)
    position.setY(i, h)

    const slope = Math.hypot(
      getTerrainHeight(x + step, z) - getTerrainHeight(x - step, z),
      getTerrainHeight(x, z + step) - getTerrainHeight(x, z - step),
    ) / (2 * step)

    // Painted grass: broad patches of two tones, darker up in the hills.
    const patch = smoothstep(0.42, 0.58, fbm(x * 0.02 + 40, z * 0.02 + 40, 3))
    color.copy(GRASS_MID).lerp(GRASS_LIGHT, patch)
    // Forest floor is darker and mossier; the high slopes are drier and paler.
    color.lerp(FOREST_FLOOR, forestFactor(x, z) * 0.8)
    color.lerp(HIGHLAND, smoothstep(0.55, 0.9, hillMask(x, z)) * 0.75)
    color.lerp(ROCK, smoothstep(0.55, 0.95, slope))

    // Sand: wide on the sea beach, a thin strip along the river.
    const sandTop = 0.5 + 1.3 * smoothstep(0.02, 0.2, coastFactor(x, z))
    color.lerp(SAND, 1 - smoothstep(sandTop - 0.3, sandTop + 0.3, h))
    color.lerp(WET_SAND, 1 - smoothstep(-0.3, 0.25, h))
    color.lerp(RIVERBED, 1 - smoothstep(-1.6, -0.5, h))

    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

export function Terrain() {
  const geometry = useMemo(createTerrainGeometry, [])
  const grass = useMemo(() => {
    const texture = createGrassTexture()
    texture.repeat.setScalar(TERRAIN_SIZE / GRASS_TILE)
    return texture
  }, [])

  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <meshLambertMaterial vertexColors map={grass} />
      </mesh>
      {/* Low ground beyond the terrain edge so the far hills never show a gap. */}
      <mesh rotation-x={-Math.PI / 2} position-y={18}>
        <ringGeometry args={[TERRAIN_SIZE * 0.49, 1600, 48, 1, Math.PI * 0.28, Math.PI * 1.44]} />
        <meshLambertMaterial color="#5a9f4b" />
      </mesh>
    </group>
  )
}

export function Water() {
  const brush = useMemo(() => {
    const texture = createBrushTexture(33)
    texture.repeat.setScalar(260)
    return texture
  }, [])

  useFrame((_, delta) => {
    brush.offset.x += delta * 0.012
    brush.offset.y += delta * 0.005
  })

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={WATER_LEVEL}>
      <planeGeometry args={[4000, 4000]} />
      <meshLambertMaterial color="#58bcd8" map={brush} transparent opacity={0.78} depthWrite={false} />
    </mesh>
  )
}

/** Distant mountain silhouettes on the landward side; fog provides the haze. */
export function Mountains() {
  const ranges = useMemo(
    () => [
      createRange(600, 930, 150, 3.7, '#7c9a86', '#93a9bd'),
      createRange(880, 1380, 330, 11.3, '#8ea6c2', '#eef3f8'),
    ],
    [],
  )
  return (
    <group position-y={8}>
      {ranges.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshLambertMaterial vertexColors flatShading />
        </mesh>
      ))}
    </group>
  )
}

/**
 * A mountain range as one continuous ridged band around the landward side of
 * the valley (the east stays open to the sea). Heights come from fractal noise,
 * so the skyline is an irregular chain of peaks and saddles.
 */
function createRange(inner: number, outer: number, peak: number, seed: number, low: string, high: string): THREE.BufferGeometry {
  const angleSegments = 260
  const radialSegments = 9
  const start = Math.PI * 0.2
  const sweep = Math.PI * 1.6
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const lowColor = new THREE.Color(low)
  const highColor = new THREE.Color(high)
  const color = new THREE.Color()

  for (let i = 0; i <= angleSegments; i++) {
    const s = i / angleSegments
    const angle = start + sweep * s
    // Sink to nothing toward both ends of the arc, where the land meets the sea.
    const ends = smoothstep(0, 0.1, s) * smoothstep(0, 0.1, 1 - s)
    const crest = 0.3 + 1.25 * fbm(Math.cos(angle) * 2.6 + seed, Math.sin(angle) * 2.6 + seed, 5)
    for (let j = 0; j <= radialSegments; j++) {
      const t = j / radialSegments
      const radius = inner + (outer - inner) * t
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      // Cross-section: rises from the foothills to the crest line, then falls away.
      const profile = Math.sin(Math.PI * Math.pow(t, 0.8)) ** 1.3
      const detail = 0.72 + 0.56 * fbm(x * 0.012 + seed, z * 0.012 + seed, 4)
      const height = peak * profile * ends * crest * detail
      positions.push(x, height, z)
      color.copy(lowColor).lerp(highColor, smoothstep(peak * 0.35, peak * 0.85, height))
      colors.push(color.r, color.g, color.b)
    }
  }
  const row = radialSegments + 1
  for (let i = 0; i < angleSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * row + j
      const b = a + row
      indices.push(a, b, a + 1, a + 1, b, b + 1)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
