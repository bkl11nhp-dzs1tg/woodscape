import { withBase } from '../services/assetUrl'
/**
 * Scale-reference figures: people and animals made from their own drawings
 * (see tools/build-figures.mjs and game/building/FigureObject.tsx). Sizes are
 * real meters of the model at its natural height; the object's own `height`
 * rescales all of it evenly. The model's front is +Z and its feet are on the ground.
 */
export type FigureKind = 'person' | 'person_sitting' | 'cat' | 'dog'

export interface FigureDef {
  kind: FigureKind
  name: string
  /** Bounding box at natural size: width (X), height (Y), depth (Z). */
  width: number
  height: number
  depth: number
  /** The drawing shown on the shelf button. */
  thumbnail: string
}

export const FIGURES: Readonly<Record<FigureKind, FigureDef>> = {
  person: { kind: 'person', name: 'Người đứng (1,70 m)', width: 0.442, height: 1.693, depth: 0.269, thumbnail: withBase('/assets/references/ref_person_standing.png') },
  person_sitting: { kind: 'person_sitting', name: 'Người ngồi ghế đẩu', width: 0.449, height: 1.16, depth: 0.612, thumbnail: withBase('/assets/references/ref_person_seat_side_right.png') },
  cat: { kind: 'cat', name: 'Mèo', width: 0.215, height: 0.552, depth: 0.638, thumbnail: withBase('/assets/references/ref_cat_standing.png') },
  dog: { kind: 'dog', name: 'Chó', width: 0.37, height: 0.808, depth: 1.053, thumbnail: withBase('/assets/references/ref_dog_standing.png') },
}

export const FIGURE_LIST: readonly FigureDef[] = Object.values(FIGURES)
