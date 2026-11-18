import { withBase } from '../../services/assetUrl'
import { useGLTF } from '@react-three/drei'
import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { MODELS } from '../../data/models'
import type { WorldObject } from '../../types/world'
import { getToonGradient } from '../materials/MaterialFactory'

/**
 * An imported 3D model (see data/models.ts). Its own textures are kept, but the
 * material is swapped for the game's painted toon shading so it sits in the
 * same world as everything else. It is stood on the ground, centered, and
 * rescaled evenly to the object's height.
 */

const toonCache = new WeakMap<THREE.Material, THREE.Material>()

function toToon(source: THREE.Material): THREE.Material {
  let toon = toonCache.get(source)
  if (!toon) {
    const standard = source as THREE.MeshStandardMaterial
    toon = new THREE.MeshToonMaterial({
      color: standard.color ?? new THREE.Color('#ffffff'),
      map: standard.map ?? null,
      gradientMap: getToonGradient(),
      transparent: standard.transparent,
      opacity: standard.opacity,
      alphaTest: standard.alphaTest,
      side: standard.side,
    })
    toonCache.set(source, toon)
  }
  return toon
}

function Loaded({ obj }: { obj: WorldObject }) {
  const g = obj.geometry as Extract<WorldObject['geometry'], { shape: 'model' }>
  const def = MODELS[g.asset]
  const gltf = useGLTF(def?.url ?? withBase('/assets/models/missing.glb'), false, true)

  const { scene, offset, naturalHeight } = useMemo(() => {
    const clone = gltf.scene.clone(true)
    clone.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (!mesh.isMesh) return
      // Some generators leave normals out; without them the shading is black.
      if (!mesh.geometry.getAttribute('normal')) mesh.geometry.computeVertexNormals()
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(toToon) : toToon(mesh.material)
    })
    const box = new THREE.Box3().setFromObject(clone)
    const centre = box.getCenter(new THREE.Vector3())
    return { scene: clone, offset: new THREE.Vector3(-centre.x, -box.min.y, -centre.z), naturalHeight: box.max.y - box.min.y }
  }, [gltf])

  const k = g.height / naturalHeight
  return (
    <group position={[0, -g.height / 2, 0]} scale={k}>
      <primitive object={scene} position={offset} />
    </group>
  )
}

export function ModelModel({ obj }: { obj: WorldObject }) {
  return (
    <Suspense fallback={null}>
      <Loaded obj={obj} />
    </Suspense>
  )
}
