import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useEditorStore } from '../../stores/editorStore'

const COLOURS = ['#ff6b6b', '#6be07a', '#6fb7ff']

/** Draws the alignment guides found while dragging (see guides.ts): one thin line per matching axis. */
export function SnapGuides() {
  const guides = useEditorStore((s) => s.guides)
  const geometries = useMemo(
    () =>
      guides.map((guide) => {
        const tick = 0.18
        const points = [new THREE.Vector3(...guide.from), new THREE.Vector3(...guide.to)]
        for (const end of [guide.from, guide.to]) {
          for (const axis of [0, 1, 2]) {
            if (axis === guide.axis) continue
            const low = [...end] as [number, number, number]
            const high = [...end] as [number, number, number]
            low[axis] -= tick
            high[axis] += tick
            points.push(new THREE.Vector3(...low), new THREE.Vector3(...high))
          }
        }
        return new THREE.BufferGeometry().setFromPoints(points)
      }),
    [guides],
  )
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries])
  if (guides.length === 0) return null
  return (
    <>
      {guides.map((guide, i) => (
        <lineSegments key={`${guide.axis}-${guide.value}`} geometry={geometries[i]} renderOrder={20} raycast={() => null}>
          <lineBasicMaterial color={COLOURS[guide.axis]} depthTest={false} transparent opacity={guide.kind === 'centre' ? 0.9 : 0.75} />
        </lineSegments>
      ))}
    </>
  )
}
