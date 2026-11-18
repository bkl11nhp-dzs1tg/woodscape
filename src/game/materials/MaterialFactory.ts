import * as THREE from 'three'
import { getMaterialDef } from '../../data/materials'
import type { Paint, WorldObject } from '../../types/world'
import { resolveFaceMaterialIds } from '../building/faceMaterials'
import { isBoxLike } from '../geometry/GeometryFactory'
import { getTexture } from './TextureRegistry'

/** Builds shared, stylized (non-PBR) materials from material preset IDs. */

export interface MaterialOptions {
  /** Translucent coat of color blended over the texture. */
  paint?: Paint
  /** Overrides the preset's opacity. */
  opacity?: number
}

const cache = new Map<string, THREE.Material>()
let toonGradient: THREE.DataTexture | null = null

/** Soft stepped shading ramp used by all painted materials. */
export function getToonGradient(): THREE.DataTexture {
  if (!toonGradient) {
    const steps = new Uint8Array([78, 132, 196, 236, 255])
    toonGradient = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat)
    toonGradient.minFilter = toonGradient.magFilter = THREE.NearestFilter
    toonGradient.needsUpdate = true
  }
  return toonGradient
}

export function getMaterial(materialId: string, options: MaterialOptions = {}): THREE.Material {
  const def = getMaterialDef(materialId)
  const paint = options.paint && options.paint.strength > 0 ? options.paint : undefined
  const opacity = THREE.MathUtils.clamp(options.opacity ?? def.opacity ?? 1, 0.05, 1)
  const key = `${def.id}|${paint ? `${paint.color}:${paint.strength.toFixed(2)}` : ''}|${opacity.toFixed(2)}`

  let material = cache.get(key)
  if (!material) {
    const toon = new THREE.MeshToonMaterial({
      color: def.color,
      map: getTexture(def.textureId),
      gradientMap: getToonGradient(),
    })
    if (opacity < 1) {
      toon.transparent = true
      toon.opacity = opacity
      toon.depthWrite = false
    }
    if (paint) {
      // Paint is mixed over the textured color, so at partial strength the
      // grain or brick pattern still shows through the coat.
      const uniforms = {
        uPaint: { value: new THREE.Color(paint.color) },
        uPaintStrength: { value: paint.strength },
      }
      toon.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms)
        shader.fragmentShader =
          'uniform vec3 uPaint;\nuniform float uPaintStrength;\n' +
          shader.fragmentShader.replace(
            '#include <map_fragment>',
            '#include <map_fragment>\n\tdiffuseColor.rgb = mix( diffuseColor.rgb, uPaint, uPaintStrength );',
          )
      }
      toon.customProgramCacheKey = () => 'woodscape-paint'
    }
    material = toon
    cache.set(key, material)
  }
  return material
}

/** One material for round shapes; six (right, left, top, bottom, front, back) for boxes. */
export function getObjectMaterials(obj: WorldObject): THREE.Material | THREE.Material[] {
  const options: MaterialOptions = { paint: obj.paint, opacity: obj.opacity }
  if (!isBoxLike(obj.geometry.shape)) return getMaterial(obj.materialId, options)
  return resolveFaceMaterialIds(obj).map((id) => getMaterial(id, options))
}
