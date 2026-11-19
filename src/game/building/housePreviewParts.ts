import type { DrawnPart, Pt } from './drawing'
import { buildDrawnParts, DRAW_DEFAULTS } from './drawing'
import type { HousePlan } from './housePlans'
import { buildRoofParts } from './roof'
import { neoclassicalDetails } from './villaDetails'

const SLAB = 0.2

/**
 * Every piece of a finished house, in plan coordinates on flat ground (y up from 0), for the preview that
 * follows the pointer before building starts. It uses the same part builders as the real build.
 */
export function previewParts(plan: HousePlan): DrawnPart[] {
  const storeys = [{ outline: plan.outline, material: plan.wallMaterial }, ...(plan.upper ?? []).map((u) => ({ outline: u.outline, material: u.wallMaterial ?? plan.wallMaterial }))]
  const rise = plan.wallHeight + SLAB
  const parts: DrawnPart[] = []
  storeys.forEach((storey, k) => {
    const style = { ...DRAW_DEFAULTS.wall, height: plan.wallHeight, thickness: plan.wallThickness, materialId: storey.material }
    parts.push(...buildDrawnParts(storey.outline, true, style, () => k * rise))
  })
  const top = storeys[storeys.length - 1].outline
  const xs = top.map((p: Pt) => p[0])
  const zs = top.map((p: Pt) => p[1])
  parts.push(
    ...buildRoofParts(
      { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs), top: (storeys.length - 1) * rise + plan.wallHeight },
      plan.roof.pitch,
      { materialId: plan.wallMaterial },
      plan.roof.kind,
    ),
  )
  if (plan.details === 'neoclassical') for (const group of neoclassicalDetails()) parts.push(...group.parts)
  for (const extra of plan.extras) parts.push(...buildDrawnParts(extra.points, extra.closed, { ...DRAW_DEFAULTS[extra.kind] }, () => 0))
  return parts
}
