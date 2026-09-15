import type { Board, Card, Column, KanbanExport, NewCardInput, UpdateCardInput } from '../types'
import type { KanbanService } from './KanbanService'

const STORAGE_KEY = 'mini-kanban:data'

interface StoredData {
  boards: Board[]
  columns: Column[]
  cards: Card[]
}

const emptyData = (): StoredData => ({ boards: [], columns: [], cards: [] })

const genId = () => crypto.randomUUID()

const nextOrder = (items: Array<{ order: number }>) =>
  items.length === 0 ? 0 : Math.max(...items.map((i) => i.order)) + 1

/**
 * Stands in for a real backend: implements KanbanService entirely against
 * localStorage, so the app is fully usable with no server. Because the
 * product spec is local-storage-only, this mock doubles as the shipped
 * implementation today; a future HTTP-backed KanbanService can replace it
 * without any caller changes.
 */
export class LocalStorageKanbanService implements KanbanService {
  private storageKey: string
  /** artificial latency so UI loading states are exercised even locally */
  private latencyMs: number

  constructor(options: { storageKey?: string; latencyMs?: number } = {}) {
    this.storageKey = options.storageKey ?? STORAGE_KEY
    this.latencyMs = options.latencyMs ?? 0
  }

  private async delay<T>(value: T): Promise<T> {
    if (this.latencyMs <= 0) return value
    await new Promise((resolve) => setTimeout(resolve, this.latencyMs))
    return value
  }

  private read(): StoredData {
    const raw = localStorage.getItem(this.storageKey)
    if (!raw) return emptyData()
    try {
      return JSON.parse(raw) as StoredData
    } catch {
      return emptyData()
    }
  }

  private write(data: StoredData): void {
    localStorage.setItem(this.storageKey, JSON.stringify(data))
  }

  private getBoardOrThrow(data: StoredData, id: string): Board {
    const board = data.boards.find((b) => b.id === id)
    if (!board) throw new Error(`Board not found: ${id}`)
    return board
  }

  private getColumnOrThrow(data: StoredData, id: string): Column {
    const column = data.columns.find((c) => c.id === id)
    if (!column) throw new Error(`Column not found: ${id}`)
    return column
  }

  private getCardOrThrow(data: StoredData, id: string): Card {
    const card = data.cards.find((c) => c.id === id)
    if (!card) throw new Error(`Card not found: ${id}`)
    return card
  }

  async listBoards(): Promise<Board[]> {
    const data = this.read()
    return this.delay([...data.boards].sort((a, b) => a.order - b.order))
  }

  async createBoard(name: string): Promise<Board> {
    const data = this.read()
    const board: Board = { id: genId(), name, order: nextOrder(data.boards) }
    data.boards.push(board)
    this.write(data)
    return this.delay(board)
  }

  async renameBoard(id: string, name: string): Promise<Board> {
    const data = this.read()
    const board = this.getBoardOrThrow(data, id)
    board.name = name
    this.write(data)
    return this.delay(board)
  }

  async deleteBoard(id: string): Promise<void> {
    const data = this.read()
    const columnIds = new Set(data.columns.filter((c) => c.boardId === id).map((c) => c.id))
    data.boards = data.boards.filter((b) => b.id !== id)
    data.columns = data.columns.filter((c) => c.boardId !== id)
    data.cards = data.cards.filter((c) => !columnIds.has(c.columnId))
    this.write(data)
    return this.delay(undefined)
  }

  async listColumns(boardId: string): Promise<Column[]> {
    const data = this.read()
    return this.delay(
      data.columns.filter((c) => c.boardId === boardId).sort((a, b) => a.order - b.order),
    )
  }

  async createColumn(boardId: string, name: string): Promise<Column> {
    const data = this.read()
    this.getBoardOrThrow(data, boardId)
    const siblings = data.columns.filter((c) => c.boardId === boardId)
    const column: Column = { id: genId(), boardId, name, order: nextOrder(siblings) }
    data.columns.push(column)
    this.write(data)
    return this.delay(column)
  }

  async renameColumn(id: string, name: string): Promise<Column> {
    const data = this.read()
    const column = this.getColumnOrThrow(data, id)
    column.name = name
    this.write(data)
    return this.delay(column)
  }

  async deleteColumn(id: string): Promise<void> {
    const data = this.read()
    data.columns = data.columns.filter((c) => c.id !== id)
    data.cards = data.cards.filter((c) => c.columnId !== id)
    this.write(data)
    return this.delay(undefined)
  }

  async reorderColumns(boardId: string, orderedColumnIds: string[]): Promise<Column[]> {
    const data = this.read()
    orderedColumnIds.forEach((id, index) => {
      const column = data.columns.find((c) => c.id === id && c.boardId === boardId)
      if (column) column.order = index
    })
    this.write(data)
    return this.delay(
      data.columns.filter((c) => c.boardId === boardId).sort((a, b) => a.order - b.order),
    )
  }

  async listCards(boardId: string): Promise<Card[]> {
    const data = this.read()
    const columnIds = new Set(data.columns.filter((c) => c.boardId === boardId).map((c) => c.id))
    return this.delay(
      data.cards.filter((c) => columnIds.has(c.columnId)).sort((a, b) => a.order - b.order),
    )
  }

  async createCard(columnId: string, input: NewCardInput): Promise<Card> {
    const data = this.read()
    this.getColumnOrThrow(data, columnId)
    const siblings = data.cards.filter((c) => c.columnId === columnId)
    const card: Card = {
      id: genId(),
      columnId,
      title: input.title,
      description: input.description ?? '',
      dueDate: input.dueDate ?? null,
      tags: input.tags ?? [],
      order: nextOrder(siblings),
      archived: false,
    }
    data.cards.push(card)
    this.write(data)
    return this.delay(card)
  }

  async updateCard(id: string, input: UpdateCardInput): Promise<Card> {
    const data = this.read()
    const card = this.getCardOrThrow(data, id)
    if (input.title !== undefined) card.title = input.title
    if (input.description !== undefined) card.description = input.description
    if (input.dueDate !== undefined) card.dueDate = input.dueDate
    if (input.tags !== undefined) card.tags = input.tags
    if (input.archived !== undefined) card.archived = input.archived
    this.write(data)
    return this.delay(card)
  }

  async moveCard(id: string, toColumnId: string, toIndex: number): Promise<Card[]> {
    const data = this.read()
    const card = this.getCardOrThrow(data, id)
    this.getColumnOrThrow(data, toColumnId)

    const fromColumnId = card.columnId
    card.columnId = toColumnId

    const destSiblings = data.cards
      .filter((c) => c.columnId === toColumnId && c.id !== id)
      .sort((a, b) => a.order - b.order)
    destSiblings.splice(toIndex, 0, card)
    destSiblings.forEach((c, index) => {
      c.order = index
    })

    if (fromColumnId !== toColumnId) {
      const sourceSiblings = data.cards
        .filter((c) => c.columnId === fromColumnId)
        .sort((a, b) => a.order - b.order)
      sourceSiblings.forEach((c, index) => {
        c.order = index
      })
    }

    this.write(data)
    return this.delay(data.cards.filter((c) => c.columnId === fromColumnId || c.columnId === toColumnId))
  }

  async deleteCard(id: string): Promise<void> {
    const data = this.read()
    data.cards = data.cards.filter((c) => c.id !== id)
    this.write(data)
    return this.delay(undefined)
  }

  async exportData(): Promise<KanbanExport> {
    const data = this.read()
    return this.delay({ ...data, exportedAt: new Date().toISOString() })
  }

  async importData(data: KanbanExport): Promise<void> {
    this.write({ boards: data.boards, columns: data.columns, cards: data.cards })
    return this.delay(undefined)
  }
}
