import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import { formatLength } from '../../services/units'
import { useEditorStore } from '../../stores/editorStore'
import { getGeometry } from '../geometry/GeometryFactory'
import { getHousePlan, planMetrics } from './housePlans'
import { previewParts } from './housePreviewParts'

const noRaycast = () => null

/**
 * The finished design of a ready-made house as a see-through model, with its measurements, shown where it
 * would stand before building starts. It sits under the placement ghost, so it moves and turns with it.
 * `height` is the ghost's height: the model is lowered by half of it to stand on the ground.
 */
export function HousePreview({ planId, height }: { planId: string; height: number }) {
  const unit = useEditorStore((s) => s.unit)
  const plan = getHousePlan(planId)
  const parts = useMemo(() => (plan ? previewParts(plan) : []), [plan])
  if (!plan) return null
  const metrics = planMetrics(plan)
  const xs = plan.outline.map((p) => p[0])
  const zs = plan.outline.map((p) => p[1])
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const z0 = Math.min(...zs)
  const z1 = Math.max(...zs)
  const label = (text: string, position: [number, number, number]) => (
    <Html position={position} center zIndexRange={[5, 0]} className="dim-label" style={{ pointerEvents: 'none' }}>
      {text}
    </Html>
  )
  return (
    <group position={[0, -height / 2, 0]}>
      {parts.map((part, i) => (
        <mesh key={i} geometry={getGeometry(part.geometry)} position={part.position} rotation={part.rotation} raycast={noRaycast} renderOrder={9}>
          <meshBasicMaterial color="#ffd36b" transparent opacity={0.34} depthWrite={false} />
        </mesh>
      ))}
      {label(formatLength(metrics.width, unit), [(x0 + x1) / 2, 0.4, z1 + 1.4])}
      {label(formatLength(metrics.depth, unit), [x1 + 1.4, 0.4, (z0 + z1) / 2])}
      {label(`cao ${formatLength(metrics.height, unit)}`, [x0 - 1.4, metrics.height / 2, z0])}
    </group>
  )
}
