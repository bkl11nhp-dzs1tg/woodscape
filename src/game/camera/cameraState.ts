/**
 * Small shared state between the 3D camera and the 2D interface, kept outside
 * React so it can change every frame without re-rendering anything.
 */

/** Where the camera is and which way it faces (written by CameraController). */
export const cameraState = { x: 0, y: 0, z: 0, yaw: 0, /** metres per second, for the speed vignette */ speed: 0 }

/** Input from the on-screen touch controls (written by TouchControls). */
export const virtualInput = {
  /** Strafe, -1..1 (right is positive). */
  moveX: 0,
  /** Forward, -1..1. */
  moveForward: 0,
  /** Up/down, -1..1. */
  vertical: 0,
}
