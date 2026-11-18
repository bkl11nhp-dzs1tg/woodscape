import { useEffect, useMemo } from 'react'
import type * as THREE from 'three'
import { TREES } from '../../data/trees'
import type { WorldObject } from '../../types/world'
import { createRng } from '../core/random'
import { addBroadleaf, addPalm, addPine, buildPartMeshes, emptyParts } from '../environment/Scenery'

/**
 * A placed tree: the same painted trunk-branch-and-leaf-card build as the wild
 * trees, grown from the object's own seed so every tree is a little different,
 * and rescaled to the object's height.
 */
export function TreeModel({ obj }: { obj: WorldObject }) {
  const g = obj.geometry as Extract<WorldObject['geometry'], { shape: 'tree' }>
  const def = TREES[g.kind]
  const meshes = useMemo(() => {
    const parts = emptyParts()
    const rng = createRng(g.seed)
    if (g.kind === 'pine') addPine(parts, 0, 0, 0, 1, rng)
    else if (g.kind === 'palm') addPalm(parts, 0, 0, 0, 1, rng)
    else addBroadleaf(parts, 0, 0, 0, 1, rng)
    const built = buildPartMeshes(parts)
    // Placed trees never catch clicks on their foliage cards; the object's box does.
    built.forEach((mesh) => {
      mesh.raycast = () => {}
    })
    return built
  }, [g.kind, g.seed])
  useEffect(() => () => meshes.forEach((mesh) => mesh.dispose()), [meshes])
  if (!def) return null
  const k = g.height / def.height
  return (
    <group position={[0, -g.height / 2, 0]} scale={k}>
      {meshes.map((mesh: THREE.InstancedMesh, i) => (
        <primitive key={i} object={mesh} />
      ))}
    </group>
  )
}
