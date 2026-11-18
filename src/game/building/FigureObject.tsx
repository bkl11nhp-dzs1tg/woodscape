import { withBase } from '../../services/assetUrl'
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { FIGURES, type FigureKind } from '../../data/figures'
import type { WorldObject } from '../../types/world'
import { getToonGradient } from '../materials/MaterialFactory'

/**
 * A solid person or animal made from its own drawings (tools/build-figures.mjs):
 * the front and side drawings carve the body shape, and the front, back and
 * side drawings are projected onto its surface, so the face, clothes and fur
 * markings are the artwork itself, seen from every direction.
 */

type View = 'front' | 'side' | 'back' | 'top' | 'topmap'

interface FigureData {
  geometry: THREE.BufferGeometry
  material: THREE.Material
}

const loading = new Map<FigureKind, Promise<FigureData>>()
const loader = new THREE.TextureLoader()
const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
white.needsUpdate = true

async function build(kind: FigureKind): Promise<FigureData> {
  const response = await fetch(`/assets/figures/figure_${kind}.json`)
  const data = (await response.json()) as {
    topBox: [number, number, number, number] | null
    textures: Partial<Record<View, { url: string; width: number; height: number }>>
    positions: number[]
    indices: number[]
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions.map((mm) => mm / 1000), 3))
  geometry.setIndex(data.indices)
  geometry.computeVertexNormals()

  const loaded = {} as Record<View, { texture: THREE.Texture; size: THREE.Vector2; has: number }>
  for (const view of ['front', 'side', 'back', 'top', 'topmap'] as const) {
    const entry = data.textures[view]
    if (entry) {
      const texture = await loader.loadAsync(withBase(entry.url))
      texture.colorSpace = THREE.SRGBColorSpace
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
      texture.anisotropy = 8
      loaded[view] = { texture, size: new THREE.Vector2(entry.width, entry.height), has: 1 }
    } else {
      loaded[view] = { texture: white, size: new THREE.Vector2(1, 1), has: 0 }
    }
  }

  const material = new THREE.MeshToonMaterial({ gradientMap: getToonGradient() })
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uFront: { value: loaded.front.texture },
      uSide: { value: loaded.side.texture },
      uBack: { value: loaded.back.texture },
      uTop: { value: loaded.top.texture },
      uTopMap: { value: loaded.topmap.texture },
      uHasTopMap: { value: loaded.topmap.has },
      uTopBox: { value: new THREE.Vector4(...(data.topBox ?? [0, 1, 0, 1])) },
      uFrontSize: { value: loaded.front.size },
      uSideSize: { value: loaded.side.size },
      uBackSize: { value: loaded.back.size },
      uHas: { value: new THREE.Vector3(loaded.front.has, loaded.side.has, loaded.back.has) },
    })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', 'varying vec3 vModelPos;\nvarying vec3 vModelNormal;\n#include <common>')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvModelPos = position;\n\tvModelNormal = normal;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `varying vec3 vModelPos;
varying vec3 vModelNormal;
uniform sampler2D uFront;
uniform sampler2D uSide;
uniform sampler2D uBack;
uniform sampler2D uTop;
uniform sampler2D uTopMap;
uniform float uHasTopMap;
uniform vec4 uTopBox;
uniform vec2 uFrontSize;
uniform vec2 uSideSize;
uniform vec2 uBackSize;
uniform vec3 uHas;
#include <common>`,
      )
      .replace(
        '#include <map_fragment>',
        `{
  // Which drawing a surface point takes its color from depends on which way the surface faces.
  vec3 n = normalize(vModelNormal);
  // Each surface takes its color from the drawing it faces most directly. A high power makes the
  // choice almost winner-takes-all, so two drawings never show through each other (no double pockets).
  // Surfaces facing up or down use the side drawing, whose top edge is hair or fur, not a face.
  // Surfaces that look mostly up (head top, shoulders, back) never take the front or back drawing: that
  // would stamp a face onto the crown.
  float upward = smoothstep(0.25, 0.6, max(n.y, 0.0));
  float wf = uHas.x * pow(max(n.z, 0.0), 8.0) * (1.0 - upward);
  float wb = uHas.z * pow(max(-n.z, 0.0), 8.0) * (1.0 - upward);
  float ws = uHas.y * pow(abs(n.x), 8.0) + 0.0005;
  // A figure with no back drawing shows its side drawing on the back instead of a face.
  if (uHas.z < 0.5) ws += uHas.y * pow(max(-n.z, 0.0), 8.0);
  vec2 uvF = vec2(vModelPos.x / uFrontSize.x + 0.5, vModelPos.y / uFrontSize.y);
  vec2 uvB = vec2(0.5 - vModelPos.x / uBackSize.x, vModelPos.y / uBackSize.y);
  // The side drawing's front (+Z) is on its right. A point keeps the same color from either flank: the
  // nose is at the front of the head whichever side you look from, so the drawing must never be flipped.
  vec2 uvS = vec2(0.5 + vModelPos.z / uSideSize.x, vModelPos.y / uSideSize.y);
  // Looking up or down at a surface, take the middle of the side drawing at that height: one clean color
  // (hair, shirt, fur) instead of a streak of whatever the drawing shows along the length.
  vec3 color = texture2D(uFront, uvF).rgb * wf + texture2D(uBack, uvB).rgb * wb + texture2D(uSide, uvS).rgb * ws;
  color = color / (wf + wb + ws);
  // Surfaces looking up or down take a clean color for their height, not a slice of the drawing.
  vec3 strip = texture2D(uTop, vec2(0.5, vModelPos.y / uSideSize.y)).rgb;
  // From above, a real top-down drawing is stretched over the figure's footprint; its front is at the bottom.
  vec2 uvT = vec2((vModelPos.x - uTopBox.x) / (uTopBox.y - uTopBox.x), 1.0 - (vModelPos.z - uTopBox.z) / (uTopBox.w - uTopBox.z));
  vec3 above = uHasTopMap > 0.5 ? texture2D(uTopMap, clamp(uvT, 0.0, 1.0)).rgb : strip;
  color = mix(color, strip, smoothstep(0.35, 0.75, max(-n.y, 0.0)));
  color = mix(color, above, smoothstep(0.35, 0.75, max(n.y, 0.0)));
  diffuseColor.rgb = color;
}`,
      )
  }
  material.customProgramCacheKey = () => `figure-${kind}`
  return { geometry, material }
}

function figureData(kind: FigureKind): Promise<FigureData> {
  let promise = loading.get(kind)
  if (!promise) {
    promise = build(kind)
    loading.set(kind, promise)
  }
  return promise
}

/** The stool the seated person sits on; the drawing has none. */
function Stool({ scale }: { scale: number }) {
  const wood = '#b98a55'
  const top = 0.4
  return (
    <group scale={scale}>
      <mesh position={[0, top - 0.02, 0.0]} castShadow receiveShadow>
        <boxGeometry args={[0.46, 0.04, 0.44]} />
        <meshToonMaterial color={wood} gradientMap={getToonGradient()} />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 0.19, (top - 0.04) / 2, sz * 0.18]} castShadow>
            <cylinderGeometry args={[0.022, 0.028, top - 0.04, 8]} />
            <meshToonMaterial color={wood} gradientMap={getToonGradient()} />
          </mesh>
        ))
      )}
    </group>
  )
}

export function FigureModel({ obj }: { obj: WorldObject }) {
  const g = obj.geometry as Extract<WorldObject['geometry'], { shape: 'figure' }>
  const def = FIGURES[g.kind]
  const [data, setData] = useState<FigureData | null>(null)
  useEffect(() => {
    let cancelled = false
    void figureData(g.kind).then((loaded) => {
      if (!cancelled) setData(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [g.kind])
  if (!def || !data) return null
  const k = g.height / def.height
  return (
    // The object's origin is the middle of its bounding box; the model's origin is on the ground.
    <group position={[0, -g.height / 2, 0]} scale={k}>
      <mesh geometry={data.geometry} material={data.material} castShadow receiveShadow />
      {g.kind === 'person_sitting' && <Stool scale={1} />}
    </group>
  )
}
