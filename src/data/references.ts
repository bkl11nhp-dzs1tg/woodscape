import { withBase } from '../services/assetUrl'
/**
 * Scale references: flat cut-out pictures of people and animals that stand in
 * the world so sizes can be judged at a glance.
 *
 * Each one is a 2D sprite inside the 3D scene, in the manner of classic 3D
 * games: the card always turns to face you, and the DRAWING on it changes with
 * where you stand around the figure. Eight directions are used. Directions
 * with no drawing are filled by mirroring the opposite one, or else by the
 * nearest drawing there is.
 *
 * Direction numbers (angle of the viewer around the figure, from its front
 * toward its left side, which is +X):
 *   0 front · 1 front-left · 2 left · 3 back-left · 4 back · 5 back-right · 6 right · 7 front-right
 * "Right" is the figure's own right hand. The drawings called `right`,
 * `front34R` and `back34R` show the figure's right shoulder nearer.
 */
export interface SpriteView {
  url: string
  /** Real size of the trimmed drawing, meters. */
  width: number
  height: number
  /** Show the drawing flipped left-to-right. */
  mirror: boolean
}

export interface ReferenceDef {
  id: string
  name: string
  /** One drawing per direction, always eight, already resolved. */
  sectors: SpriteView[]
  /** The front-facing drawing, which sets the object's own size. */
  main: SpriteView
  source: string
}

const DIR = withBase('/assets/references/')
const BATCHES = 'ChatGPT art batches 02-04 (art_inbox/), backgrounds removed and trimmed'

interface Drawing {
  file: string
  width: number
  height: number
}
const drawing = (file: string, width: number, height: number): Drawing => ({ file: `${DIR}${file}.png`, width, height })
const sprite = (d: Drawing, mirror = false): SpriteView => ({ url: d.file, width: d.width, height: d.height, mirror })

/** Fills all eight directions from the drawings that exist, keyed by direction number. */
function eight(given: Partial<Record<number, Drawing>>): SpriteView[] {
  const result: (SpriteView | undefined)[] = Array.from({ length: 8 }, (_, s) => (given[s] ? sprite(given[s]!) : undefined))
  // First choice for a gap: the opposite side, flipped.
  for (let s = 1; s < 8; s++) {
    const twin = (8 - s) % 8
    if (!result[s] && given[twin] && s !== 4) result[s] = sprite(given[twin]!, true)
  }
  // Otherwise: the nearest direction that has a drawing.
  return result.map((view, s) => {
    if (view) return view
    for (let step = 1; step <= 4; step++) {
      const near = result[(s + step) % 8] ?? result[(s - step + 8) % 8]
      if (near) return near
    }
    throw new Error('a reference needs at least one drawing')
  })
}

const list: ReferenceDef[] = [
  {
    id: 'ref_person_standing',
    name: 'Người đứng (1,70 m)',
    sectors: eight({
      0: drawing('ref_person_standing', 0.442, 1.7),
      7: drawing('ref_person_standing_front34', 0.415, 1.7),
      6: drawing('ref_person_standing_side', 0.271, 1.7),
      5: drawing('ref_person_standing_back34', 0.395, 1.7),
      4: drawing('ref_person_standing_back', 0.477, 1.7),
    }),
    main: sprite(drawing('ref_person_standing', 0.442, 1.7)),
    source: BATCHES,
  },
  {
    // Drawn on one scale: 387.7 pixels per meter. Seat height about 0.40 m.
    id: 'ref_person_sitting',
    name: 'Người ngồi (1,2 m)',
    sectors: eight({
      0: drawing('ref_person_seat_front', 0.454, 1.215),
      7: drawing('ref_person_seat_front34', 0.609, 1.189),
      6: drawing('ref_person_seat_side_right', 0.629, 1.163),
      2: drawing('ref_person_seat_side_left', 0.622, 1.161),
      5: drawing('ref_person_seat_back34', 0.624, 1.176),
      4: drawing('ref_person_seat_back', 0.472, 1.176),
    }),
    main: sprite(drawing('ref_person_seat_front', 0.454, 1.215)),
    source: BATCHES,
  },
  {
    // Body length 0.46 m; the pictures reach higher because of the raised tail.
    id: 'ref_cat_standing',
    name: 'Mèo',
    sectors: eight({
      0: drawing('ref_cat_standing_front', 0.212, 0.588),
      1: drawing('ref_cat_front34', 0.366, 0.57),
      6: drawing('ref_cat_standing', 0.64, 0.555),
      4: drawing('ref_cat_standing_back', 0.216, 0.591),
    }),
    main: sprite(drawing('ref_cat_standing', 0.64, 0.555)),
    source: BATCHES,
  },
  {
    // Head-to-paw height 0.81 m.
    id: 'ref_dog_standing',
    name: 'Chó',
    sectors: eight({
      0: drawing('ref_dog_standing_front', 0.371, 0.864),
      6: drawing('ref_dog_standing', 1.058, 0.81),
      4: drawing('ref_dog_standing_back', 0.31, 0.864),
    }),
    main: sprite(drawing('ref_dog_standing', 1.058, 0.81)),
    source: BATCHES,
  },
]

export const REFERENCES: Readonly<Record<string, ReferenceDef>> = Object.fromEntries(list.map((item) => [item.id, item]))
export const REFERENCE_LIST: readonly ReferenceDef[] = list

export function mainView(ref: ReferenceDef): SpriteView {
  return ref.main
}

/** The drawing used for thumbnails. */
export function referenceImage(ref: ReferenceDef | undefined): string | undefined {
  return ref ? ref.main.url : undefined
}
