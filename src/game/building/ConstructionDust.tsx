import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useConstructionStore } from '../../stores/constructionStore'
import { useEditorStore } from '../../stores/editorStore'
import { QUALITY } from '../core/quality'
import { useWorldStore } from '../../stores/worldStore'
import { getTerrainHeight } from '../environment/terrain'
import { growth } from './growth'

const COUNT = 700

const vertex = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  uniform float uPixels;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * uPixels / max(0.5, -view.z), 0.0, 220.0);
    gl_Position = projectionMatrix * view;
  }
`

const fragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`

/**
 * Building dust: soft puffs thrown up where pieces are going up and drifting around the site while a
 * house is under construction. They rise, spread and fade.
 */
export function ConstructionDust() {
  const points = useRef<THREE.Points>(null)
  const state = useMemo(
    () => ({
      position: new Float32Array(COUNT * 3),
      size: new Float32Array(COUNT),
      alpha: new Float32Array(COUNT),
      velocity: new Float32Array(COUNT * 3),
      age: new Float32Array(COUNT).fill(99),
      life: new Float32Array(COUNT).fill(1),
      start: new Float32Array(COUNT).fill(0.5),
      end: new Float32Array(COUNT).fill(2),
      peak: new Float32Array(COUNT).fill(0.3),
      cursor: 0,
      carry: 0,
    }),
    [],
  )
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(state.position, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(state.size, 1))
    g.setAttribute('aAlpha', new THREE.BufferAttribute(state.alpha, 1))
    return g
  }, [state])
  const uniforms = useMemo(() => ({ uPixels: { value: 600 }, uColor: { value: new THREE.Color('#d8cdb8') } }), [])
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __woodscapeDust?: unknown }).__woodscapeDust = state
    return () => geometry.dispose()
  }, [geometry, state])

  const spawn = (x: number, y: number, z: number, size: number, peak: number) => {
    const i = state.cursor
    state.cursor = (i + 1) % COUNT
    state.position.set([x, y, z], i * 3)
    state.velocity.set([(Math.random() - 0.5) * 0.5, 0.25 + Math.random() * 0.45, (Math.random() - 0.5) * 0.5], i * 3)
    state.age[i] = 0
    state.life[i] = 2.2 + Math.random() * 1.8
    state.start[i] = size * (0.6 + Math.random() * 0.5)
    state.end[i] = size * (2.4 + Math.random() * 1.4)
    state.peak[i] = peak
  }

  useFrame(({ camera, gl }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    // Emission follows real time, so a slow machine still gets a thick cloud.
    const emitDelta = Math.min(rawDelta, 0.4)
    const cloud = points.current
    if (!cloud) return
    uniforms.uPixels.value = gl.domElement.height / (2 * Math.tan(((camera as THREE.PerspectiveCamera).fov * Math.PI) / 360))

    const building = useConstructionStore.getState().active
    const dustOn = QUALITY[useEditorStore.getState().qualityLevel].particles
    if (dustOn && (growth.size > 0 || building)) {
      const now = performance.now()
      const objects = useWorldStore.getState().objects
      // Puffs where pieces are going up right now.
      state.carry += emitDelta * 150
      let budget = Math.floor(state.carry)
      state.carry -= budget
      if (growth.size > 0) {
        const ids = [...growth.keys()]
        for (let tries = 0; tries < Math.min(budget, 40) * 3 && budget > 0; tries++) {
          const id = ids[Math.floor(Math.random() * ids.length)]
          const entry = growth.get(id)
          const obj = objects[id]
          if (!entry || !obj) continue
          const t = (now - entry.start) / entry.duration
          if (t < 0 || t > 1) continue
          const [x, y, z] = obj.transform.position
          const low = entry.mode === 'rise' ? getTerrainHeight(x, z) + 0.15 : y
          spawn(x + (Math.random() - 0.5) * 1.2, Math.max(low, y - 0.3), z + (Math.random() - 0.5) * 1.4, 2.2, 0.7)
          budget--
        }
      }
      // A thin haze around the plot the whole time.
      if (building && Math.random() < emitDelta * 40) {
        const { x, z, radius } = building.site
        const angle = Math.random() * Math.PI * 2
        const reach = radius * (0.5 + Math.random() * 0.6)
        const px = x + Math.cos(angle) * reach
        const pz = z + Math.sin(angle) * reach
        spawn(px, getTerrainHeight(px, pz) + 0.2, pz, 3.2, 0.45)
      }
    }

    let alive = false
    for (let i = 0; i < COUNT; i++) {
      if (state.age[i] >= state.life[i]) {
        state.alpha[i] = 0
        continue
      }
      alive = true
      state.age[i] += delta
      const t = Math.min(1, state.age[i] / state.life[i])
      state.position[i * 3] += state.velocity[i * 3] * delta
      state.position[i * 3 + 1] += state.velocity[i * 3 + 1] * delta
      state.position[i * 3 + 2] += state.velocity[i * 3 + 2] * delta
      state.velocity[i * 3 + 1] *= 1 - delta * 0.35
      state.size[i] = state.start[i] + (state.end[i] - state.start[i]) * Math.sqrt(t)
      // Fade in quickly, then thin out.
      state.alpha[i] = state.peak[i] * Math.min(1, t * 8) * Math.pow(1 - t, 1.6)
    }
    cloud.visible = alive
    if (!alive) return
    ;(geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    ;(geometry.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true
    ;(geometry.getAttribute('aAlpha') as THREE.BufferAttribute).needsUpdate = true
  })

  return (
    <points ref={points} geometry={geometry} frustumCulled={false} renderOrder={8}>
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} transparent depthWrite={false} />
    </points>
  )
}
