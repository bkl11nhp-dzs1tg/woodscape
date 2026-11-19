/** Canonical world data. Lengths are meters, angles are radians, Y is up. */

export type BoxFace = 'right' | 'left' | 'top' | 'bottom' | 'front' | 'back'

/** Order matches the material groups of the box geometry (+X, -X, +Y, -Y, +Z, -Z). */
export const BOX_FACES: readonly BoxFace[] = ['right', 'left', 'top', 'bottom', 'front', 'back']

export type GeometryParams =
  | { shape: 'box'; width: number; height: number; depth: number }
  | { shape: 'panel'; width: number; height: number; thickness: number }
  /**
   * Triangular prism: a triangle (base `width`, apex up) extruded along Z. Isosceles by default;
   * with `lean` it is a right-angled wedge whose upright side is on that end.
   */
  | { shape: 'prism'; width: number; height: number; depth: number; lean?: 'left' | 'right' }
  /** Door: frame plus a hinged leaf. `thickness` is the frame depth through the wall. */
  | { shape: 'door'; width: number; height: number; thickness: number; hinge: 'left' | 'right' }
  /** Window: frame plus hinged glazed sashes (two when 1 m or wider). */
  | { shape: 'window'; width: number; height: number; thickness: number }
  /** Plain opening: cuts a hole in the wall it sits in and has no parts of its own. */
  | { shape: 'opening'; width: number; height: number; thickness: number }
  /** Flat outline (and optional holes) in local XY, pushed through `depth` along Z. Made by the cut tool. */
  | { shape: 'extrude'; points: [number, number][]; holes?: [number, number][][]; depth: number }
  /** Flat upright picture of a person or animal (see data/references.ts) used to judge scale. */
  | { shape: 'card'; asset: string; width: number; height: number }
  /** Solid person or animal for judging scale (see data/figures.ts). `height` rescales the whole model. */
  | { shape: 'figure'; kind: 'person' | 'person_sitting' | 'cat' | 'dog'; height: number }
  /** A painted tree (see data/trees.ts); `seed` picks its particular branching. */
  | { shape: 'tree'; kind: 'broadleaf' | 'pine' | 'palm'; height: number; seed: number }
  /** An imported 3D model (see data/models.ts); `height` rescales it evenly. */
  | { shape: 'model'; asset: string; height: number }
  | { shape: 'sphere'; radius: number }
  | { shape: 'cylinder'; radius: number; height: number }
  | { shape: 'cone'; radius: number; height: number }

export type ShapeKind = GeometryParams['shape']

export type Vec3 = [number, number, number]

/** A translucent coat of color over the object's material. `strength` 0..1 is how much it covers. */
export interface Paint {
  color: string
  strength: number
}

export interface WorldObject {
  id: string
  /** Asset/preset type, e.g. `wood_beam`, `brick_block`, `primitive_sphere`. */
  type: string
  name: string
  materialId: string
  /** Optional per-face overrides; only meaningful for box-like shapes. */
  faceMaterials?: Partial<Record<BoxFace, string>>
  geometry: GeometryParams
  transform: { position: Vec3; rotation: Vec3 }
  locked: boolean
  /** Objects sharing a group ID are selected and moved together. */
  groupId?: string
  /** Display name of the group; stored on every member so it survives ungrouping one piece. */
  groupName?: string
  paint?: Paint
  /** Overrides the material's opacity (0.1..1). On windows it applies to the glass. */
  opacity?: number
  /** Doors and windows only: whether the leaf / sashes are swung open. */
  open?: boolean
}

export type LengthUnit = 'm' | 'cm' | 'mm'
