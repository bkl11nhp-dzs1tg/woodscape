import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useWorldStore } from '../../stores/worldStore'
import { createRng } from '../core/random'
import { useEditorStore } from '../../stores/editorStore'
import { QUALITY } from '../core/quality'
import { atmosphere, updateAtmosphere } from './atmosphere'

const SHADOW_RANGE = 70
/** The shadow map is only redrawn when something it shows has changed (and once a second as a safety net). */
const SHADOW_IDLE_REFRESH_MS = 1000
const SHADOW_SETTLE_MS = 1600
/** The shadow window moves in whole steps of this many meters, so shadows do not shimmer as you walk. */
const SHADOW_STEP = 2

/** Advances the sky (time of day and weather glide) once per frame, before anything reads it. */
export function AtmosphereDriver() {
  useFrame((_, delta) => updateAtmosphere(delta))
  return null
}

/** Sun/moon + ambient light for the current look of the sky. Shadows follow the camera target. */
export function Lighting() {
  const quality = QUALITY[useEditorStore((s) => s.qualityLevel)]
  const light = useRef<THREE.DirectionalLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null
  const scene = useThree((state) => state.scene)
  const gl = useThree((state) => state.gl)
  const shadow = useRef({ objects: null as unknown, x: NaN, z: NaN, version: -1, lastDraw: 0, hotUntil: 0 })
  const snapped = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    scene.fog = new THREE.Fog(atmosphere.fog.getHex(), atmosphere.fogNear, atmosphere.fogFar)
    // Shadows are drawn on demand: a still scene costs nothing while you spin the camera around it.
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    return () => {
      scene.fog = null
      gl.shadowMap.autoUpdate = true
    }
  }, [scene, gl])

  useFrame(() => {
    const sun = light.current
    if (!sun) return
    const now = performance.now()
    const memory = shadow.current
    if (controls) {
      snapped.set(Math.round(controls.target.x / SHADOW_STEP) * SHADOW_STEP, controls.target.y, Math.round(controls.target.z / SHADOW_STEP) * SHADOW_STEP)
      sun.target.position.copy(snapped)
    }
    sun.position.copy(sun.target.position).addScaledVector(atmosphere.sunDirection, 220)
    sun.target.updateMatrixWorld()

    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(atmosphere.fog)
      scene.fog.near = atmosphere.fogNear
      scene.fog.far = atmosphere.fogFar
    }
    sun.color.copy(atmosphere.sunColor)
    sun.intensity = atmosphere.sunIntensity
    if (hemi.current) {
      hemi.current.color.copy(atmosphere.hemiSky)
      hemi.current.groundColor.copy(atmosphere.hemiGround)
      hemi.current.intensity = atmosphere.hemiIntensity
    }

    // Redraw the shadow map when the world, the sun or the shadow window changed, then keep going briefly
    // so doors that are still swinging are caught.
    const objects = useWorldStore.getState().objects
    const changed = objects !== memory.objects || atmosphere.version !== memory.version || snapped.x !== memory.x || snapped.z !== memory.z
    if (changed) {
      memory.objects = objects
      memory.version = atmosphere.version
      memory.x = snapped.x
      memory.z = snapped.z
      memory.hotUntil = now + SHADOW_SETTLE_MS
    }
    if (changed || now < memory.hotUntil || now - memory.lastDraw > SHADOW_IDLE_REFRESH_MS) {
      gl.shadowMap.needsUpdate = true
      memory.lastDraw = now
    }
  })

  return (
    <>
      <hemisphereLight ref={hemi} />
      <directionalLight
        key={`${quality.shadows}-${quality.shadowSize}`}
        ref={light}
        castShadow={quality.shadows}
        shadow-mapSize={[quality.shadowSize, quality.shadowSize]}
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

/** Gradient sky dome plus drifting 2D cloud cards; both follow the camera and fade smoothly with the weather. */
export function Sky() {
  const group = useRef<THREE.Group>(null)
  const drift = useRef<THREE.Group>(null)
  const materials = useRef<(THREE.SpriteMaterial | null)[]>([])
  const seen = useRef('')
  const level = useEditorStore((s) => s.qualityLevel)

  const uniforms = useMemo(
    () => ({ topColor: { value: new THREE.Color() }, horizonColor: { value: new THREE.Color() } }),
    [],
  )

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
    const stamp = `${atmosphere.version}|${level}`
    if (seen.current === stamp) return
    seen.current = stamp
    const cloudCap = QUALITY[level].clouds
    uniforms.topColor.value.copy(atmosphere.skyTop)
    uniforms.horizonColor.value.copy(atmosphere.skyHorizon)
    materials.current.forEach((material, i) => {
      if (!material) return
      material.color.copy(atmosphere.cloud)
      const opacity = THREE.MathUtils.clamp(Math.min(atmosphere.clouds, cloudCap) - i, 0, 1) * 0.96
      material.opacity = opacity
      material.visible = opacity > 0.01
    })
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
        {clouds.map((cloud, i) => (
          <sprite key={i} position={cloud.position} scale={cloud.scale} renderOrder={-1}>
            <spriteMaterial ref={(m) => void (materials.current[i] = m)} map={cloud.texture} transparent opacity={0} depthWrite={false} fog={false} />
          </sprite>
        ))}
      </group>
      <Rain />
      <Snow />
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
    const shower = lines.current
    if (!shower) return
    const material = shower.material as THREE.LineBasicMaterial
    material.opacity = atmosphere.rain * 0.45
    shower.visible = atmosphere.rain > 0.01 && QUALITY[useEditorStore.getState().qualityLevel].particles
    if (!shower.visible) return
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

const FLAKES = 1600
const SNOW_AREA = 40
const SNOW_HEIGHT = 24

/** Slow flakes that sway as they fall, in a box that travels with the camera. */
function Snow() {
  const points = useRef<THREE.Points>(null)
  const sway = useRef(new Float32Array(FLAKES * 2))
  const geometry = useMemo(() => {
    const rng = createRng(4242)
    const positions = new Float32Array(FLAKES * 3)
    for (let i = 0; i < FLAKES; i++) {
      positions.set([(rng() - 0.5) * SNOW_AREA, rng() * SNOW_HEIGHT, (rng() - 0.5) * SNOW_AREA], i * 3)
      sway.current[i * 2] = rng() * Math.PI * 2
      sway.current[i * 2 + 1] = 0.6 + rng() * 0.9
    }
    const buffer = new THREE.BufferGeometry()
    buffer.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return buffer
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ camera, clock }, delta) => {
    const cloud = points.current
    if (!cloud) return
    const material = cloud.material as THREE.PointsMaterial
    material.opacity = atmosphere.snow * 0.9
    cloud.visible = atmosphere.snow > 0.01 && QUALITY[useEditorStore.getState().qualityLevel].particles
    if (!cloud.visible) return
    const attribute = geometry.getAttribute('position') as THREE.BufferAttribute
    const array = attribute.array as Float32Array
    const fall = Math.min(delta, 0.1) * 1.7
    const t = clock.elapsedTime
    for (let i = 0; i < FLAKES; i++) {
      let y = array[i * 3 + 1] - fall * sway.current[i * 2 + 1]
      if (y < 0) y += SNOW_HEIGHT
      array[i * 3 + 1] = y
      array[i * 3] += Math.sin(t * 0.7 + sway.current[i * 2]) * 0.004
      array[i * 3 + 2] += Math.cos(t * 0.5 + sway.current[i * 2]) * 0.004
    }
    attribute.needsUpdate = true
    cloud.position.set(0, camera.position.y - SNOW_HEIGHT / 2, 0)
  })

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial color="#ffffff" size={0.13} sizeAttenuation transparent opacity={0} depthWrite={false} fog={false} />
    </points>
  )
}
