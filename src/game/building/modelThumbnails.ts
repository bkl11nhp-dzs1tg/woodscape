import * as THREE from 'three'
import { GLTFLoader, MeshoptDecoder } from 'three-stdlib'
import type { ModelDef } from '../../data/models'

/**
 * Small preview pictures of imported 3D models for the shelf, rendered from
 * the model itself the first time it is needed (so a new model needs no
 * hand-made icon). One shared offscreen renderer; results are cached.
 */

const SIZE = 128
let renderer: THREE.WebGLRenderer | null = null
const cache = new Map<string, Promise<string>>()
let queue: Promise<unknown> = Promise.resolve()

function sharedRenderer(): THREE.WebGLRenderer {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(SIZE, SIZE)
    renderer.setPixelRatio(1)
    renderer.outputColorSpace = THREE.SRGBColorSpace
  }
  return renderer
}

async function render(def: ModelDef): Promise<string> {
  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder())
  const gltf = await loader.loadAsync(def.url)
  const scene = new THREE.Scene()
  scene.add(gltf.scene)
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a8f70', 1.6))
  const sun = new THREE.DirectionalLight('#fff4dd', 2.2)
  sun.position.set(2, 3, 4)
  scene.add(sun)

  // Look at the model from the front and a little from above and the side, filling the picture.
  const box = new THREE.Box3().setFromObject(gltf.scene)
  const sphere = box.getBoundingSphere(new THREE.Sphere())
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100)
  const direction = new THREE.Vector3(0.75, 0.35, 1).normalize()
  camera.position.copy(sphere.center).addScaledVector(direction, sphere.radius / Math.sin((camera.fov * Math.PI) / 360) * 1.02)
  camera.lookAt(sphere.center)

  const gl = sharedRenderer()
  gl.setClearColor(0x000000, 0)
  gl.render(scene, camera)
  const url = gl.domElement.toDataURL('image/png')
  scene.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (mesh.isMesh) mesh.geometry.dispose()
  })
  return url
}

/** A picture of the model, as a data URL. Pictures are drawn one at a time. */
export function modelThumbnail(def: ModelDef): Promise<string> {
  let promise = cache.get(def.id)
  if (!promise) {
    promise = new Promise<string>((resolve, reject) => {
      queue = queue.then(() => render(def).then(resolve, reject))
    })
    cache.set(def.id, promise)
  }
  return promise
}
