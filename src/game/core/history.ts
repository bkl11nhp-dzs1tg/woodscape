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

/** Folds every command recorded after the stack held `length` entries into one, so a whole build undoes in one step. */
export function mergeSince(length: number, label: string): void {
  const { undoStack } = useHistoryStore.getState()
  if (undoStack.length - length < 2) return
  const parts = undoStack.slice(length)
  const merged: Command = {
    label,
    execute: () => parts.forEach((part) => part.execute()),
    undo: () => [...parts].reverse().forEach((part) => part.undo()),
  }
  useHistoryStore.setState({ undoStack: [...undoStack.slice(0, length), merged] })
}

export function clearHistory(): void {
  useHistoryStore.setState({ undoStack: [], redoStack: [] })
}

/**
 * Folds the given commands (taken from anywhere in the undo list) into one, placed where the last of them was.
 * Edits made in between by someone else keep their own entries.
 */
export function mergeCommands(parts: Command[], label: string): void {
  if (parts.length < 2) return
  const { undoStack } = useHistoryStore.getState()
  const mine = new Set(parts)
  const last = parts[parts.length - 1]
  const merged: Command = {
    label,
    execute: () => parts.forEach((part) => part.execute()),
    undo: () => [...parts].reverse().forEach((part) => part.undo()),
  }
  const next: Command[] = []
  for (const command of undoStack) {
    if (command === last) next.push(merged)
    else if (!mine.has(command)) next.push(command)
  }
  useHistoryStore.setState({ undoStack: next })
}
