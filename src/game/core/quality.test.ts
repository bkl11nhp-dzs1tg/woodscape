import { describe, expect, it } from 'vitest'
import { FrameJudge, guessLevel, lowerLevel, QUALITY, QUALITY_ORDER } from './quality'

describe('quality levels', () => {
  it('each level asks for no more work than the one above it', () => {
    for (let i = 1; i < QUALITY_ORDER.length; i++) {
      const better = QUALITY[QUALITY_ORDER[i - 1]]
      const worse = QUALITY[QUALITY_ORDER[i]]
      expect(worse.dpr[1]).toBeLessThanOrEqual(better.dpr[1])
      expect(worse.grass).toBeLessThanOrEqual(better.grass)
      expect(worse.trees).toBeLessThanOrEqual(better.trees)
      expect(worse.clouds).toBeLessThanOrEqual(better.clouds)
      expect(worse.shadowSize).toBeLessThanOrEqual(better.shadowSize)
    }
  })

  it('steps down one level at a time and stops at the bottom', () => {
    expect(lowerLevel('high')).toBe('medium')
    expect(lowerLevel('low')).toBe('minimum')
    expect(lowerLevel('minimum')).toBe('minimum')
  })

  it('guesses lower for phones and for few cores', () => {
    expect(guessLevel({ coarsePointer: false, smallestSide: 900, cores: 8 })).toBe('high')
    expect(guessLevel({ coarsePointer: true, smallestSide: 400, cores: 8 })).toBe('medium')
    expect(guessLevel({ coarsePointer: true, smallestSide: 400, cores: 4 })).toBe('low')
    expect(guessLevel({ coarsePointer: false, smallestSide: 900, memoryGb: 2 })).toBe('medium')
  })
})

describe('FrameJudge', () => {
  const run = (judge: FrameJudge, fps: number, seconds: number) => {
    let dropped = 0
    for (let t = 0; t < seconds; t += 1 / fps) if (judge.tick(1 / fps)) dropped++
    return dropped
  }

  it('leaves a smooth game alone', () => {
    expect(run(new FrameJudge(), 58, 40)).toBe(0)
  })

  it('steps down when frames stay slow, but not at once', () => {
    const judge = new FrameJudge()
    expect(run(judge, 14, 6)).toBe(0)
    expect(run(judge, 14, 12)).toBeGreaterThanOrEqual(1)
  })

  it('ignores a single hitch and a paused tab', () => {
    const judge = new FrameJudge()
    run(judge, 60, 8)
    expect(judge.tick(3)).toBe(false)
    expect(run(judge, 60, 20)).toBe(0)
  })
})
