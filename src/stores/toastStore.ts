import { create } from 'zustand'

/** Small, short-lived notices (e.g. "deleted X — undo"). */
export interface Toast {
  id: number
  text: string
  /** Offer an "undo" button on this toast. */
  undo?: boolean
}

interface ToastState {
  toasts: Toast[]
}

export const useToastStore = create<ToastState>(() => ({ toasts: [] }))

let nextId = 1
const LIFETIME_MS = 4500

export function showToast(text: string, options: { undo?: boolean } = {}): void {
  const id = nextId++
  useToastStore.setState((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, undo: options.undo }] }))
  if (typeof window !== 'undefined') window.setTimeout(() => dismissToast(id), LIFETIME_MS)
}

export function dismissToast(id: number): void {
  useToastStore.setState((s) => ({ toasts: s.toasts.filter((toast) => toast.id !== id) }))
}
