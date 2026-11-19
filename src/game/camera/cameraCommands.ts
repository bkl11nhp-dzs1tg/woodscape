/** Decouples UI buttons from the Three.js camera: UI emits, CameraController listens. */

export type ViewPreset = 'perspective' | 'top' | 'front' | 'side'

export type CameraCommand =
  | { type: 'view'; preset: ViewPreset }
  | { type: 'focus' }
  /** Act on what the middle of the screen points at (the on-screen action button). */
  | { type: 'tap' }
  /** Move over a point on the map, keeping the current height above ground. */
  | { type: 'goto'; x: number; z: number }

type Listener = (command: CameraCommand) => void

const listeners = new Set<Listener>()

export const cameraCommands = {
  emit(command: CameraCommand): void {
    listeners.forEach((listener) => listener(command))
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
