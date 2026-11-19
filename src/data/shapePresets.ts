import type { ClusterPart } from '../game/building/clusters'
import { HOUSE_PLANS } from '../game/building/housePlans'
import type { GeometryParams, Vec3, WorldObject } from '../types/world'
import { MODEL_LIST } from './models'
import { mainView, REFERENCE_LIST } from './references'
import { TREE_LIST } from './trees'

/** Starting points offered in the shape shelf. Everything stays editable after placement. */
export interface ShapePreset {
  id: string
  /** Becomes the object's `type`. */
  type: string
  name: string
  group: 'Hình cơ bản' | 'Gỗ' | 'Gạch' | 'Cửa' | 'Cây' | 'Tham chiếu' | 'Mô hình 3D' | 'Mẫu của tôi' | 'Nhà mẫu'
  geometry: GeometryParams
  materialId: string
  faceMaterials?: WorldObject['faceMaterials']
  /** A saved template or generated structure: placing it adds all of these as one group. */
  cluster?: ClusterPart[]
  /** A ready-made house (see housePlans.ts): placing it starts a step-by-step build instead of dropping a piece. */
  house?: string
}

export const SHAPE_PRESETS: readonly ShapePreset[] = [
  ...HOUSE_PLANS.map(
    (plan): ShapePreset => ({
      id: `preset_${plan.id}`,
      type: 'house',
      name: plan.name,
      group: 'Nhà mẫu',
      geometry: { shape: 'box', width: plan.plot[0], height: plan.height, depth: plan.plot[1] },
      materialId: plan.wallMaterial,
      house: plan.id,
    }),
  ),
  { id: 'preset_box', type: 'primitive_box', name: 'Khối hộp', group: 'Hình cơ bản', geometry: { shape: 'box', width: 0.5, height: 0.5, depth: 0.5 }, materialId: 'pine_painted' },
  { id: 'preset_sphere', type: 'primitive_sphere', name: 'Khối cầu', group: 'Hình cơ bản', geometry: { shape: 'sphere', radius: 0.3 }, materialId: 'birch_painted' },
  { id: 'preset_cylinder', type: 'primitive_cylinder', name: 'Khối trụ', group: 'Hình cơ bản', geometry: { shape: 'cylinder', radius: 0.2, height: 1 }, materialId: 'cedar_painted' },
  { id: 'preset_cone', type: 'primitive_cone', name: 'Khối nón', group: 'Hình cơ bản', geometry: { shape: 'cone', radius: 0.3, height: 0.6 }, materialId: 'roof_shingles_painted' },
  { id: 'preset_prism', type: 'primitive_prism', name: 'Khối tam giác', group: 'Hình cơ bản', geometry: { shape: 'prism', width: 1, height: 0.5, depth: 0.5 }, materialId: 'pine_painted' },
  { id: 'preset_wedge', type: 'primitive_wedge', name: 'Khối nêm', group: 'Hình cơ bản', geometry: { shape: 'prism', width: 1, height: 0.5, depth: 0.5, lean: 'right' }, materialId: 'pine_painted' },
  { id: 'preset_panel', type: 'primitive_panel', name: 'Tấm mỏng', group: 'Hình cơ bản', geometry: { shape: 'panel', width: 1, height: 1, thickness: 0.03 }, materialId: 'birch_painted' },
  {
    id: 'preset_beam', type: 'wood_beam', name: 'Dầm gỗ', group: 'Gỗ',
    geometry: { shape: 'box', width: 0.15, height: 0.1, depth: 2.4 }, materialId: 'pine_painted',
    faceMaterials: { front: 'pine_endgrain_painted', back: 'pine_endgrain_painted' },
  },
  {
    id: 'preset_plank', type: 'wood_plank', name: 'Ván gỗ', group: 'Gỗ',
    geometry: { shape: 'box', width: 0.2, height: 0.03, depth: 2 }, materialId: 'oak_painted',
    faceMaterials: { front: 'oak_endgrain_painted', back: 'oak_endgrain_painted' },
  },
  {
    id: 'preset_post', type: 'wood_post', name: 'Cột gỗ', group: 'Gỗ',
    geometry: { shape: 'box', width: 0.12, height: 2.2, depth: 0.12 }, materialId: 'oak_painted',
    faceMaterials: { top: 'oak_endgrain_painted', bottom: 'oak_endgrain_painted' },
  },
  { id: 'preset_wood_panel', type: 'wood_panel', name: 'Tấm gỗ', group: 'Gỗ', geometry: { shape: 'panel', width: 1.2, height: 0.9, thickness: 0.03 }, materialId: 'walnut_painted' },
  { id: 'preset_brick', type: 'brick', name: 'Viên gạch', group: 'Gạch', geometry: { shape: 'box', width: 0.215, height: 0.065, depth: 0.1025 }, materialId: 'brick_red_solid' },
  {
    id: 'preset_brick_wall', type: 'brick_block', name: 'Khối tường gạch', group: 'Gạch',
    geometry: { shape: 'box', width: 1.2, height: 0.75, depth: 0.22 }, materialId: 'brick_red_painted',
    faceMaterials: { top: 'concrete_painted', bottom: 'concrete_painted' },
  },
  { id: 'preset_floor_tile', type: 'floor_tile', name: 'Gạch lát nền', group: 'Gạch', geometry: { shape: 'box', width: 0.4, height: 0.02, depth: 0.4 }, materialId: 'floor_tile_painted' },
  { id: 'preset_shingle', type: 'roof_tile', name: 'Viên ngói', group: 'Gạch', geometry: { shape: 'box', width: 0.3, height: 0.02, depth: 0.2 }, materialId: 'roof_terracotta_painted' },
  { id: 'preset_door', type: 'door', name: 'Cửa chính', group: 'Cửa', geometry: { shape: 'door', width: 0.9, height: 2.05, thickness: 0.14, hinge: 'left' }, materialId: 'oak_painted' },
  { id: 'preset_opening', type: 'opening', name: 'Ô trống', group: 'Cửa', geometry: { shape: 'opening', width: 1, height: 2, thickness: 0.3 }, materialId: 'plain_white' },
  { id: 'preset_window', type: 'window', name: 'Cửa sổ', group: 'Cửa', geometry: { shape: 'window', width: 1, height: 1.2, thickness: 0.14 }, materialId: 'birch_painted' },
  ...MODEL_LIST.map(
    (model): ShapePreset => ({
      id: `preset_model_${model.id}`,
      type: 'model',
      name: model.name,
      group: 'Mô hình 3D',
      geometry: { shape: 'model', asset: model.id, height: model.height },
      materialId: 'plain_white',
    }),
  ),
  ...TREE_LIST.map(
    (def): ShapePreset => ({
      id: `preset_tree_${def.kind}`,
      type: 'tree',
      name: def.name,
      group: 'Cây',
      geometry: { shape: 'tree', kind: def.kind, height: def.height, seed: 1 },
      materialId: 'plain_white',
    }),
  ),
  ...REFERENCE_LIST.filter((ref) => ref.id === 'ref_person_standing' || ref.id === 'ref_person_sitting').map(
    (ref): ShapePreset => ({
      id: `preset_${ref.id}`,
      type: 'reference',
      name: ref.name,
      group: 'Tham chiếu',
      geometry: { shape: 'card', asset: ref.id, width: mainView(ref).width, height: mainView(ref).height },
      materialId: 'plain_white',
    }),
  ),
]

/** Presets made while playing (saved templates, a staircase being set up). Looked up like the built-in ones. */
const runtimePresets = new Map<string, ShapePreset>()

export function registerPreset(preset: ShapePreset): void {
  runtimePresets.set(preset.id, preset)
}

export function unregisterPreset(id: string): void {
  runtimePresets.delete(id)
}

export function getShapePreset(id: string | null): ShapePreset | undefined {
  if (!id) return undefined
  return SHAPE_PRESETS.find((preset) => preset.id === id) ?? runtimePresets.get(id)
}

export function createObjectFromPreset(
  preset: ShapePreset,
  id: string,
  position: Vec3,
  rotation: Vec3 = [0, 0, 0],
): WorldObject {
  return {
    id,
    type: preset.type,
    name: preset.name,
    materialId: preset.materialId,
    faceMaterials: preset.faceMaterials ? { ...preset.faceMaterials } : undefined,
    // Every placed tree grows its own shape.
    geometry: preset.geometry.shape === 'tree' ? { ...preset.geometry, seed: Math.floor(Math.random() * 1e9) } : { ...preset.geometry },
    transform: { position, rotation },
    locked: false,
  }
}
