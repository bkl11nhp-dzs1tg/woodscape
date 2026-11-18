import { useEditorStore } from '../../stores/editorStore'
import { transformObjects } from './commands'
import { objectMeshes } from './interaction'

/**
 * On touch screens a moved or turned object is not committed the moment the
 * finger lifts: it stays where it was dropped until the player confirms, so a
 * slip of the finger never changes the world. These two finish that step.
 */

export function confirmPendingMove(): void {
  const pending = useEditorStore.getState().pendingMove
  if (!pending) return
  useEditorStore.setState({ pendingMove: null })
  transformObjects(pending.proposed, pending.label)
}

/** Puts every object of an unconfirmed move back where it was. */
export function cancelPendingMove(): void {
  const pending = useEditorStore.getState().pendingMove
  if (!pending) return
  for (const [id, original] of Object.entries(pending.original)) {
    const node = objectMeshes.get(id)
    if (!node) continue
    node.position.set(...original.position)
    node.rotation.set(...original.rotation)
  }
  useEditorStore.setState({ pendingMove: null })
}
