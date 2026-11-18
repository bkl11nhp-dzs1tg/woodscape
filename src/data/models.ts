import { withBase } from '../services/assetUrl'
import registry from './models.json'

/**
 * 3D models brought in from an outside generator (Tripo, Meshy…). The list in
 * models.json is written by `node tools/optimize-model.mjs`, never by hand:
 * drop a .glb in, run the tool, and it appears in the shelf.
 * Sizes are real meters of the model at natural size; the object's own
 * `height` rescales it evenly. The model stands on y = 0, centered on x and z.
 */
export interface ModelDef {
  id: string
  name: string
  url: string
  width: number
  height: number
  depth: number
  source: string
}

export const MODEL_LIST: readonly ModelDef[] = (registry as ModelDef[]).map((model) => ({ ...model, url: withBase(model.url) }))
export const MODELS: Readonly<Record<string, ModelDef>> = Object.fromEntries(MODEL_LIST.map((model) => [model.id, model]))
