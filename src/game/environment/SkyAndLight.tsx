import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useEditorStore, type Weather } from '../../stores/editorStore'
import { createRng } from '../core/random'
import { sunDirection, TIME_PRESETS } from './timeOfDay'

const SHADOW_RANGE = 70

interface WeatherLook {
  label: string
  /** Multipliers on the time-of-day light. */
  sun: number
  ambient: number
  /** How far the sky and clouds shift toward `tint`. */
  overcast: number
  tint: string
  cloudCount: number
  fogNear: number
  fogFar: number
  rain: boolean
}

export const WEATHER_ORDER: readonly Weather[] = ['clear', 'cloudy', 'rain', 'fog']

export const WEATHER: Record<Weather, WeatherLook> = {
  clear: { label: 'Trời quang', sun: 1, ambient: 1, overcast: 0, tint: '#ffffff', cloudCount: 16, fogNear: 90, fogFar: 1500, rain: false },
  cloudy: { label: 'Nhiều mây', sun: 0.55, ambient: 1.08, overcast: 0.55, tint: '#aeb8c2', cloudCount: 44, fogNear: 180, fogFar: 1400, rain: false },
  rain: { label: 'Mưa', sun: 0.28, ambient: 0.95, overcast: 0.8, tint: '#8793a0', cloudCount: 52, fogNear: 50, fogFar: 650, rain: true },
  fog: { label: 'Sương mù', sun: 0.55, ambient: 1.05, overcast: 0.7, tint: '#d3dadd', cloudCount: 10, fogNear: 6, fogFar: 150, rain: false },
}

function mixColor(from: string, to: string, amount: number): THREE.Color {
  return new THREE.Color(from).lerp(new THREE.Color(to), amount)
}

/** Sun/moon + ambient light for the current time and weather. Shadows follow the camera target. */
export function Lighting() {
  const preset = TIME_PRESETS[useEditorStore((s) => s.timeOfDay)]
  const weather = WEATHER[useEditorStore((s) => s.weather)]
  const light = useRef<THREE.DirectionalLight>(null)
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null
  const scene = useThree((state) => state.scene)
  const direction = useMemo(() => new THREE.Vector3(...sunDirection(preset)), [preset])

  useEffect(() => {
    scene.fog = new THREE.Fog(mixColor(preset.fog, weather.tint, weather.overcast), weather.fogNear, weather.fogFar)
    return () => {
      scene.fog = null
    }
  }, [scene, preset, weather])

  useFrame(() => {
    const sun = light.current
    if (!sun) return
    if (controls) sun.target.position.copy(controls.target)
    sun.position.copy(sun.target.position).addScaledVector(direction, 220)
    sun.target.updateMatrixWorld()
  })

  return (
    <>
      <hemisphereLight args={[preset.hemiSky, preset.hemiGround, preset.hemiIntensity * weather.ambient]} />
      <directionalLight
        ref={light}
        color={preset.sunColor}
        intensity={preset.sunIntensity * weather.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
      >
        <orthographicCamera attach="shadow-camera" args={[-SHADOW_RANGE, SHADOW_RANGE, SHADOW_RANGE, -SHADOW_RANGE, 1, 500]} />
      </directionalLight>
    </>
  )
}

const skyVertex = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const skyFragment = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  varying vec3 vDirection;
  void main() {
    float t = pow(clamp(vDirection.y, 0.0, 1.0), 0.55);
    gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
    #include <colorspace_fragment>
  }
`

/**
 * Painted cumulus cloud: a heap of soft puffs with a flat base, bright on top
 * and shaded blue-grey underneath.
 */
function createCloudTexture(seed: number): THREE.CanvasTexture {
  const width = 512
  const height = 256
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const rng = createRng(seed)
  const base = 178

  ctx.filter = 'blur(5px)'
  ctx.fillStyle = '#ffffff'
  const lumps = 3 + Math.floor(rng() * 3)
  for (let l = 0; l < lumps; l++) {
    const cx = 150 + rng() * 212
    const lumpHeight = 40 + rng() * 60
    const lumpWidth = 50 + rng() * 60
    for (let i = 0; i < 16; i++) {
      const t = rng()
      const r = (20 + rng() * 22) * (1 - t * 0.35)
      // Keep every puff (and its blur) inside the image, or the card shows a straight cut edge.
      const x = THREE.MathUtils.clamp(cx + (rng() - 0.5) * 2 * lumpWidth * (1 - t * 0.6), r + 16, width - r - 16)
      const y = Math.max(base - t * lumpHeight, r * 1.4 + 16)
      ctx.beginPath()
      ctx.arc(x, y - r * 0.4, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // Wide flat foot so the cloud sits on a level base.
  ctx.beginPath()
  ctx.ellipse(256, base - 6, 190, 20, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.filter = 'none'

  // Shade only where the cloud is: bright crown, cool underside.
  ctx.globalCompositeOperation = 'source-atop'
  const shade = ctx.createLinearGradient(0, 40, 0, base + 10)
  shade.addColorStop(0, 'rgba(255,255,255,0)')
  shade.addColorStop(0.55, 'rgba(214,228,243,0.25)')
  shade.addColorStop(1, 'rgba(150,176,208,0.85)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, width, height)

  // Cut the bottom off softly.
  ctx.globalCompositeOperation = 'destination-out'
  const cut = ctx.createLinearGradient(0, base - 8, 0, base + 14)
  cut.addColorStop(0, 'rgba(0,0,0,0)')
  cut.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.fillStyle = cut
  ctx.fillRect(0, base - 8, width, height)
  ctx.globalCompositeOperation = 'source-over'

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

const MAX_CLOUDS = 56

/** Gradient sky dome plus drifting 2D cloud cards; both follow the camera. */
export function Sky() {
  const preset = TIME_PRESETS[useEditorStore((s) => s.timeOfDay)]
  const weather = WEATHER[useEditorStore((s) => s.weather)]
  const group = useRef<THREE.Group>(null)
  const drift = useRef<THREE.Group>(null)

  const uniforms = useMemo(
    () => ({ topColor: { value: new THREE.Color() }, horizonColor: { value: new THREE.Color() } }),
    [],
  )
  uniforms.topColor.value.copy(mixColor(preset.skyTop, weather.tint, weather.overcast * 0.85))
  uniforms.horizonColor.value.copy(mixColor(preset.skyHorizon, weather.tint, weather.overcast))
  const cloudColor = mixColor(preset.cloud, weather.tint, weather.overcast * 0.8).multiplyScalar(1 - weather.overcast * 0.25)

  const clouds = useMemo(() => {
    const textures = Array.from({ length: 5 }, (_, i) => createCloudTexture(3 + i * 17))
    const rng = createRng(5)
    return Array.from({ length: MAX_CLOUDS }, (_, i) => {
      const angle = rng() * Math.PI * 2
      // Two layers: big clouds low on the horizon, smaller ones higher up.
      const high = i % 3 === 0
      const distance = (high ? 500 : 800) + rng() * 600
      const width = (high ? 260 : 420) + rng() * 420
      return {
        texture: textures[i % textures.length],
        position: [Math.cos(angle) * distance, (high ? 420 : 170) + rng() * 220, Math.sin(angle) * distance] as [number, number, number],
        scale: [width, width * 0.5, 1] as [number, number, number],
      }
    })
  }, [])

  useFrame(({ camera }, delta) => {
    group.current?.position.set(camera.position.x, 0, camera.position.z)
    if (drift.current) drift.current.rotation.y += delta * 0.004
  })

  return (
    <group ref={group}>
      <mesh renderOrder={-2} frustumCulled={false}>
        <sphereGeometry args={[1900, 32, 16]} />
        <shaderMaterial
          vertexShader={skyVertex}
          fragmentShader={skyFragment}
          uniforms={uniforms}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      <group ref={drift}>
        {clouds.slice(0, weather.cloudCount).map((cloud, i) => (
          <sprite key={i} position={cloud.position} scale={cloud.scale} renderOrder={-1}>
            <spriteMaterial map={cloud.texture} color={cloudColor} transparent opacity={0.96} depthWrite={false} fog={false} />
          </sprite>
        ))}
      </group>
      {weather.rain && <Rain />}
    </group>
  )
}

const RAIN_DROPS = 1400
const RAIN_AREA = 46
const RAIN_HEIGHT = 30

/** Falling streaks in a box that travels with the camera. */
function Rain() {
  const lines = useRef<THREE.LineSegments>(null)
  const geometry = useMemo(() => {
    const rng = createRng(909)
    const positions = new Float32Array(RAIN_DROPS * 6)
    for (let i = 0; i < RAIN_DROPS; i++) {
      const x = (rng() - 0.5) * RAIN_AREA
      const y = rng() * RAIN_HEIGHT
      const z = (rng() - 0.5) * RAIN_AREA
      positions.set([x, y, z, x + 0.08, y - 0.7, z], i * 6)
    }
    const buffer = new THREE.BufferGeometry()
    buffer.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return buffer
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ camera }, delta) => {
    const attribute = geometry.getAttribute('position') as THREE.BufferAttribute
    const array = attribute.array as Float32Array
    const fall = Math.min(delta, 0.1) * 26
    for (let i = 0; i < RAIN_DROPS; i++) {
      let y = array[i * 6 + 1] - fall
      if (y < 0) y += RAIN_HEIGHT
      array[i * 6 + 1] = y
      array[i * 6 + 4] = y - 0.7
    }
    attribute.needsUpdate = true
    lines.current?.position.set(0, camera.position.y - RAIN_HEIGHT / 2, 0)
  })

  return (
    <lineSegments ref={lines} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color="#dbe8f5" transparent opacity={0.45} depthWrite={false} />
    </lineSegments>
  )
}
