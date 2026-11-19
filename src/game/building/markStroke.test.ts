import { describe, expect, it } from 'vitest'
import type { Pt } from './drawing'
import { isClosedStroke, polygonArea, simplifyStroke, strokeLength } from './markStroke'

describe('freehand stroke', () => {
  it('measures a polyline', () => {
    expect(strokeLength([[0, 0], [3, 0], [3, 4]])).toBeCloseTo(7)
  })

  it('straightens a wobbly line into its corners', () => {
    const wobbly: Pt[] = []
    for (let i = 0; i <= 20; i++) wobbly.push([i * 0.2, (i % 2) * 0.02])
    for (let i = 1; i <= 20; i++) wobbly.push([4, i * 0.2 + (i % 2) * 0.02])
    const tidy = simplifyStroke(wobbly, 0.06)
    expect(tidy.length).toBeLessThanOrEqual(4)
    expect(tidy[0]).toEqual(wobbly[0])
    expect(tidy[tidy.length - 1]).toEqual(wobbly[wobbly.length - 1])
    // the corner survives
    expect(tidy.some((p) => Math.abs(p[0] - 4) < 0.05 && Math.abs(p[1]) < 0.05)).toBe(true)
  })

  it('knows a closed loop and its area', () => {
    const square: Pt[] = [[0, 0], [2, 0], [2, 2], [0, 2], [0.1, 0.1]]
    expect(isClosedStroke(square, 0.5)).toBe(true)
    expect(isClosedStroke([[0, 0], [2, 0], [4, 0], [6, 0]], 0.5)).toBe(false)
    expect(polygonArea([[0, 0], [2, 0], [2, 2], [0, 2]])).toBeCloseTo(4)
  })
})
