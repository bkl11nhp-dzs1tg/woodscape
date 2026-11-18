import { withBase } from '../services/assetUrl'
/**
 * Texture and material registries. Objects reference these by stable ID;
 * swap a file or a definition here to restyle every object that uses it.
 *
 * Each texture records where its image came from in `source`. Entries marked
 * as Graphics Kit are still procedural placeholders awaiting painted art.
 */

export interface TextureDef {
  id: string
  /** Public URL of the image, or null for a code-generated texture. */
  url: string | null
  /** World size in meters [along U, along V] covered by one repeat of the image. */
  tileSize: [number, number]
  source: string
}

export type MaterialCategory = 'wood' | 'brick' | 'stone' | 'glass' | 'roofing' | 'metal' | 'plain'

export interface MaterialDef {
  id: string
  name: string
  category: MaterialCategory
  textureId: string
  /** Tint multiplied with the texture. */
  color: string
  opacity?: number
}

const KIT = 'WOODSCAPE Graphics Kit (procedural placeholder)'
const BATCH_01 = 'ChatGPT art batch 01 (art_inbox/batch_01_collage.png), cut and made tileable'
const BATCH_01_DERIVED = 'Recolored from a batch 01 texture'

/** Four painted planks of 15 cm per repeat. */
const WOOD_TILE: [number, number] = [0.79, 0.6]

const textureList: TextureDef[] = [
  { id: 'tex_wood_pine', url: '/assets/textures/wood/wood_pine_albedo.png', tileSize: WOOD_TILE, source: BATCH_01 },
  { id: 'tex_wood_oak', url: '/assets/textures/wood/wood_oak_albedo.png', tileSize: WOOD_TILE, source: BATCH_01 },
  { id: 'tex_wood_walnut', url: '/assets/textures/wood/wood_walnut_albedo.png', tileSize: WOOD_TILE, source: BATCH_01 },
  { id: 'tex_wood_cedar', url: '/assets/textures/wood/wood_cedar_albedo.png', tileSize: WOOD_TILE, source: BATCH_01_DERIVED },
  { id: 'tex_wood_birch', url: '/assets/textures/wood/wood_birch_albedo.png', tileSize: WOOD_TILE, source: BATCH_01_DERIVED },
  { id: 'tex_brick_red', url: '/assets/textures/brick/red_brick_albedo.png', tileSize: [0.675, 0.6], source: BATCH_01 },
  { id: 'tex_stone_masonry', url: '/assets/textures/stone/stone_masonry_albedo.png', tileSize: [1.6, 1.6], source: KIT },
  { id: 'tex_concrete', url: '/assets/textures/stone/concrete_albedo.png', tileSize: [2, 2], source: KIT },
  { id: 'tex_roof_shingles', url: '/assets/textures/roofing/roof_shingles_albedo.png', tileSize: [1.5, 1.5], source: KIT },
  { id: 'tex_glass_tinted', url: '/assets/textures/glass/glass_tinted_albedo.png', tileSize: [1, 1], source: KIT },
  { id: 'tex_roof_terracotta', url: '/assets/textures/roofing/roof_terracotta_albedo.png', tileSize: [1.56, 1.04], source: 'ChatGPT art batch 02 (art_inbox/batch_02_roof_tiles.png), cut to one repeat' },
  { id: 'tex_plain', url: null, tileSize: [1, 1], source: 'Generated in code (flat white)' },
  { id: 'tex_brush_neutral', url: null, tileSize: [0.8, 0.8], source: 'Generated in code (brush strokes)' },
]

const materialList: MaterialDef[] = [
  { id: 'pine_painted', name: 'Gỗ thông', category: 'wood', textureId: 'tex_wood_pine', color: '#ffffff' },
  { id: 'pine_endgrain_painted', name: 'Gỗ thông (đầu gỗ)', category: 'wood', textureId: 'tex_brush_neutral', color: '#c9a36a' },
  { id: 'oak_painted', name: 'Gỗ sồi', category: 'wood', textureId: 'tex_wood_oak', color: '#ffffff' },
  { id: 'oak_endgrain_painted', name: 'Gỗ sồi (đầu gỗ)', category: 'wood', textureId: 'tex_brush_neutral', color: '#a8733c' },
  { id: 'walnut_painted', name: 'Gỗ óc chó', category: 'wood', textureId: 'tex_wood_walnut', color: '#ffffff' },
  { id: 'cedar_painted', name: 'Gỗ tuyết tùng', category: 'wood', textureId: 'tex_wood_cedar', color: '#ffffff' },
  { id: 'birch_painted', name: 'Gỗ bạch dương', category: 'wood', textureId: 'tex_wood_birch', color: '#ffffff' },
  { id: 'brick_red_painted', name: 'Gạch đỏ (mảng tường)', category: 'brick', textureId: 'tex_brick_red', color: '#ffffff' },
  { id: 'brick_red_solid', name: 'Gạch đỏ (viên)', category: 'brick', textureId: 'tex_brush_neutral', color: '#c8563c' },
  { id: 'stone_masonry_painted', name: 'Đá xây', category: 'stone', textureId: 'tex_stone_masonry', color: '#ffffff' },
  { id: 'concrete_painted', name: 'Bê tông / vữa', category: 'stone', textureId: 'tex_concrete', color: '#ffffff' },
  { id: 'roof_terracotta_painted', name: 'Ngói đất nung', category: 'roofing', textureId: 'tex_roof_terracotta', color: '#ffffff' },
  { id: 'roof_shingles_painted', name: 'Ngói lợp', category: 'roofing', textureId: 'tex_roof_shingles', color: '#ffffff' },
  { id: 'glass_tinted_painted', name: 'Kính xanh', category: 'glass', textureId: 'tex_plain', color: '#7fc6f2', opacity: 0.6 },
  { id: 'glass_clear_painted', name: 'Kính trong', category: 'glass', textureId: 'tex_plain', color: '#e4f3fb', opacity: 0.3 },
  { id: 'metal_dark', name: 'Kim loại sẫm', category: 'metal', textureId: 'tex_brush_neutral', color: '#55555c' },
  { id: 'chalk_white', name: 'Vạch phấn', category: 'plain', textureId: 'tex_brush_neutral', color: '#ffffff' },
  { id: 'plain_white', name: 'Sơn trắng', category: 'plain', textureId: 'tex_brush_neutral', color: '#f3ede0' },
]

export const TEXTURES: Readonly<Record<string, TextureDef>> = Object.fromEntries(
  textureList.map((t) => [t.id, { ...t, url: t.url ? withBase(t.url) : t.url }]),
)

export const MATERIALS: Readonly<Record<string, MaterialDef>> = Object.fromEntries(
  materialList.map((m) => [m.id, m]),
)

export const FALLBACK_MATERIAL_ID = 'plain_white'

export function getMaterialDef(id: string): MaterialDef {
  return MATERIALS[id] ?? MATERIALS[FALLBACK_MATERIAL_ID]
}
