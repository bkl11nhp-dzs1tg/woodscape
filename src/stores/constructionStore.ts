import { create } from 'zustand'

/** A house being raised step by step: what it is and which step it is on. Plain data only. */
interface ConstructionState {
  active: { name: string; step: number; total: number; label: string; site: { x: number; z: number; radius: number } } | null
  /** Set by the Cancel button; the builder stops before its next step. */
  stopRequested: boolean
  /** Houses lined up behind the one being built. */
  queued: number
}

export const useConstructionStore = create<ConstructionState>(() => ({ active: null, stopRequested: false, queued: 0 }))
