import { BOX_FACES, type BoxFace, type WorldObject } from '../../types/world'

/**
 * Material ID for each box face, in geometry group order
 * (right, left, top, bottom, front, back). Faces without an override use
 * the object's default material.
 */
export function resolveFaceMaterialIds(obj: Pick<WorldObject, 'materialId' | 'faceMaterials'>): string[] {
  return BOX_FACES.map((face) => obj.faceMaterials?.[face] ?? obj.materialId)
}

export const FACE_LABELS: Record<BoxFace, string> = {
  right: 'Phải',
  left: 'Trái',
  top: 'Trên',
  bottom: 'Dưới',
  front: 'Trước',
  back: 'Sau',
}
