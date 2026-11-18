import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { REFERENCES } from '../../data/references'
import type { WorldObject } from '../../types/world'

/**
 * A reference sprite: a flat picture of a person or animal standing in the 3D
 * world. The card always turns to face you; the drawing on it follows where
 * you stand around the figure (eight directions, see data/references.ts), so
 * walking around it reads as seeing it from every side.
 */

const SECTOR = Math.PI / 4
const textures = new Map<string, THREE.Texture>()
const loader = new THREE.TextureLoader()

function spriteTexture(url: string): THREE.Texture {
  let texture = textures.get(url)
  if (!texture) {
    texture = loader.load(url)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    textures.set(url, texture)
  }
  return texture
}

export function CardPicture({ obj }: { obj: WorldObject }) {
  const g = obj.geometry as Extract<WorldObject['geometry'], { shape: 'card' }>
  const mesh = useRef<THREE.Mesh>(null)
  const material = useRef<THREE.MeshLambertMaterial>(null)
  const sector = useRef(-1)
  const ref = REFERENCES[g.asset]

  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(1, 1)
    // Normals point up so the picture is lit like the ground it stands on, from either side.
    const normals = plane.getAttribute('normal')
    for (let i = 0; i < normals.count; i++) normals.setXYZ(i, 0, 1, 0)
    return plane
  }, [])

  useFrame(({ camera }) => {
    const node = mesh.current
    const parent = node?.parent
    if (!node || !parent || !ref || !material.current) return
    // Bearing of the camera from the figure, then relative to where the figure faces (+Z of the object).
    const bearing = Math.atan2(camera.position.x - parent.position.x, camera.position.z - parent.position.z)
    node.rotation.y = bearing - parent.rotation.y
    const around = bearing - parent.rotation.y
    const direction = ((Math.round(around / SECTOR) % 8) + 8) % 8
    const view = ref.sectors[direction]
    if (sector.current !== direction) {
      sector.current = direction
      material.current.map = spriteTexture(view.url)
      material.current.needsUpdate = true
    }
    // Resizing the object resizes every drawing alike; feet stay on the card's base line.
    const k = g.height / ref.main.height
    node.scale.set(view.width * k * (view.mirror ? -1 : 1), view.height * k, 1)
    node.position.y = -g.height / 2 + (view.height * k) / 2
  })

  if (!ref) return null
  return (
    <mesh ref={mesh} geometry={geometry} scale={[g.width, g.height, 1]}>
      <meshLambertMaterial ref={material} map={spriteTexture(ref.sectors[0].url)} alphaTest={0.5} side={THREE.DoubleSide} />
    </mesh>
  )
}
