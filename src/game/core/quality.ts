/**
 * Graphics quality. A strong phone and a weak one need very different amounts of work per frame, so the game
 * has four levels and can pick one by itself ("auto": start from a guess about the device, then step down
 * if the frame rate stays low). Everything here is plain data; the scene reads it.
 */

export type QualityLevel = 'high' | 'medium' | 'low' | 'minimum'
export type QualityChoice = 'auto' | QualityLevel

export interface QualitySettings {
  label: string
  /** Pixel ratio range: the canvas never renders at more than the second number. */
  dpr: [number, number]
  shadows: boolean
  shadowSize: number
  /** Thin ink lines round every piece. */
  ink: boolean
  antialias: boolean
  /** Share of grass tufts and flowers, 0..1. */
  grass: number
  /** Share of the wild trees, 0..1. */
  trees: number
  /** Most clouds in the sky at once. */
  clouds: number
  /** Rain, snow and building dust. */
  particles: boolean
}

export const QUALITY_ORDER: readonly QualityLevel[] = ['high', 'medium', 'low', 'minimum']

export const QUALITY: Record<QualityLevel, QualitySettings> = {
  high: { label: 'Cao', dpr: [1, 1.75], shadows: true, shadowSize: 2048, ink: true, antialias: true, grass: 1, trees: 1, clouds: 56, particles: true },
  medium: { label: 'Vừa', dpr: [1, 1.25], shadows: true, shadowSize: 1024, ink: true, antialias: true, grass: 0.6, trees: 0.75, clouds: 36, particles: true },
  low: { label: 'Thấp', dpr: [0.85, 1], shadows: false, shadowSize: 512, ink: false, antialias: false, grass: 0.3, trees: 0.5, clouds: 20, particles: true },
  minimum: { label: 'Tối thiểu (máy yếu)', dpr: [0.6, 0.75], shadows: false, shadowSize: 512, ink: false, antialias: false, grass: 0, trees: 0.25, clouds: 8, particles: false },
}

export const QUALITY_KEY = 'woodscape.quality.v1'

interface DeviceHints {
  cores?: number
  memoryGb?: number
  coarsePointer: boolean
  smallestSide: number
}

/** A first guess at what the device can do, before any frame has been timed. */
export function guessLevel(hints: DeviceHints): QualityLevel {
  const weak = (hints.cores !== undefined && hints.cores <= 4) || (hints.memoryGb !== undefined && hints.memoryGb <= 3)
  if (hints.coarsePointer) return weak ? 'low' : 'medium'
  return weak ? 'medium' : 'high'
}

export function deviceHints(): DeviceHints {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return { coarsePointer: false, smallestSide: 1000 }
  return {
    cores: navigator.hardwareConcurrency,
    memoryGb: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    coarsePointer: window.matchMedia?.('(pointer: coarse)').matches ?? false,
    smallestSide: Math.min(window.innerWidth, window.innerHeight),
  }
}

/** One step down the ladder, or the same level at the bottom. */
export function lowerLevel(level: QualityLevel): QualityLevel {
  return QUALITY_ORDER[Math.min(QUALITY_ORDER.length - 1, QUALITY_ORDER.indexOf(level) + 1)]
}

export function loadQualityChoice(): QualityChoice {
  try {
    const saved = localStorage.getItem(QUALITY_KEY)
    if (saved === 'auto' || (saved && saved in QUALITY)) return saved as QualityChoice
  } catch {
    /* private window: stay on auto */
  }
  return 'auto'
}

export function saveQualityChoice(choice: QualityChoice): void {
  try {
    localStorage.setItem(QUALITY_KEY, choice)
  } catch {
    /* the choice lasts for this visit only */
  }
}

/**
 * Decides when "auto" should step down: it needs a few slow measurements in a row (so a single hiccup while
 * loading does not count) and then waits for the new level to settle before judging again.
 */
export class FrameJudge {
  private frames = 0
  private elapsed = 0
  private slowWindows = 0
  private warmup: number

  constructor(
    private readonly slowBelowFps = 26,
    private readonly windowSeconds = 3,
    private readonly windowsNeeded = 2,
    warmupSeconds = 5,
  ) {
    this.warmup = warmupSeconds
  }

  /** Feed one frame; returns true when the level should go down. */
  tick(deltaSeconds: number): boolean {
    // A paused tab or a huge hitch is not a measurement.
    if (deltaSeconds > 1) return false
    if (this.warmup > 0) {
      this.warmup -= deltaSeconds
      return false
    }
    this.frames++
    this.elapsed += deltaSeconds
    if (this.elapsed < this.windowSeconds) return false
    const fps = this.frames / this.elapsed
    this.frames = 0
    this.elapsed = 0
    this.slowWindows = fps < this.slowBelowFps ? this.slowWindows + 1 : 0
    if (this.slowWindows >= this.windowsNeeded) {
      this.slowWindows = 0
      this.warmup = 4
      return true
    }
    return false
  }

  /** After the level changed by hand or by itself: forget the old measurements. */
  reset(): void {
    this.frames = 0
    this.elapsed = 0
    this.slowWindows = 0
    this.warmup = 4
  }
}
