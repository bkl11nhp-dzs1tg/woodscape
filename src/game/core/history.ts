import { create } from 'zustand'

/** Command-based undo/redo. Commands hold only the data needed to reverse themselves. */

export interface Command {
  /** Operation name, e.g. AddObject, MoveObject, ResizeObject. */
  label: string
  execute(): void
  undo(): void
}

const MAX_HISTORY = 200

interface HistoryState {
  undoStack: Command[]
  redoStack: Command[]
}

export const useHistoryStore = create<HistoryState>(() => ({ undoStack: [], redoStack: [] }))

export function executeCommand(command: Command): void {
  command.execute()
  useHistoryStore.setState((s) => ({
    undoStack: [...s.undoStack, command].slice(-MAX_HISTORY),
    redoStack: [],
  }))
}

export function undo(): void {
  const { undoStack, redoStack } = useHistoryStore.getState()
  const command = undoStack[undoStack.length - 1]
  if (!command) return
  command.undo()
  useHistoryStore.setState({ undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, command] })
}

export function redo(): void {
  const { undoStack, redoStack } = useHistoryStore.getState()
  const command = redoStack[redoStack.length - 1]
  if (!command) return
  command.execute()
  useHistoryStore.setState({ undoStack: [...undoStack, command], redoStack: redoStack.slice(0, -1) })
}

export function clearHistory(): void {
  useHistoryStore.setState({ undoStack: [], redoStack: [] })
}
