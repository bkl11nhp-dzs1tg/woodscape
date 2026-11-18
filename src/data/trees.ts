/**
 * Placeable trees, built the same way as the wild ones (game/environment/Scenery.ts).
 * Sizes are the natural size at scale 1; the object's `height` rescales the tree.
 */
export type TreeKind = 'broadleaf' | 'pine' | 'palm'

export interface TreeDef {
  kind: TreeKind
  name: string
  width: number
  height: number
  depth: number
}

export const TREES: Readonly<Record<TreeKind, TreeDef>> = {
  broadleaf: { kind: 'broadleaf', name: 'Cây lá rộng', width: 4.6, height: 5.6, depth: 4.6 },
  pine: { kind: 'pine', name: 'Cây thông', width: 3.8, height: 6.1, depth: 3.8 },
  palm: { kind: 'palm', name: 'Cây dừa', width: 5, height: 5.4, depth: 5 },
}

export const TREE_LIST: readonly TreeDef[] = Object.values(TREES)
