import type { Board, Card, Column, KanbanExport, NewCardInput, UpdateCardInput } from '../types'

/**
 * Every read/write the frontend needs from a backend, in one place.
 * Swap the implementation (e.g. for a real HTTP client) without touching callers.
 */
export interface KanbanService {
  listBoards(): Promise<Board[]>
  createBoard(name: string): Promise<Board>
  renameBoard(id: string, name: string): Promise<Board>
  deleteBoard(id: string): Promise<void>

  listColumns(boardId: string): Promise<Column[]>
  createColumn(boardId: string, name: string): Promise<Column>
  renameColumn(id: string, name: string): Promise<Column>
  deleteColumn(id: string): Promise<void>
  reorderColumns(boardId: string, orderedColumnIds: string[]): Promise<Column[]>

  listCards(boardId: string): Promise<Card[]>
  createCard(columnId: string, input: NewCardInput): Promise<Card>
  updateCard(id: string, input: UpdateCardInput): Promise<Card>
  moveCard(id: string, toColumnId: string, toIndex: number): Promise<Card[]>
  deleteCard(id: string): Promise<void>

  exportData(): Promise<KanbanExport>
  importData(data: KanbanExport): Promise<void>
}
