import { create } from 'zustand'
import { kanbanService, type KanbanService } from '../services'
import type { Board, Card, Column, NewCardInput, UpdateCardInput } from '../types'

export type DueFilter = 'all' | 'overdue' | 'week' | 'none'

interface KanbanState {
  service: KanbanService
  boards: Board[]
  columns: Column[]
  cards: Card[]
  activeBoardId: string | null
  loading: boolean
  searchQuery: string
  tagFilter: string | null
  dueFilter: DueFilter
  archivedPanelOpen: boolean

  init: () => Promise<void>
  reset: () => void
  selectBoard: (boardId: string) => Promise<void>
  createBoard: (name: string) => Promise<Board>
  renameBoard: (id: string, name: string) => Promise<void>
  deleteBoard: (id: string) => Promise<void>

  createColumn: (name: string) => Promise<void>
  renameColumn: (id: string, name: string) => Promise<void>
  deleteColumn: (id: string) => Promise<void>
  reorderColumns: (orderedColumnIds: string[]) => Promise<void>

  createCard: (columnId: string, input: NewCardInput) => Promise<void>
  updateCard: (id: string, input: UpdateCardInput) => Promise<void>
  moveCard: (id: string, toColumnId: string, toIndex: number) => Promise<void>
  deleteCard: (id: string) => Promise<void>
  archiveCard: (id: string) => Promise<void>
  restoreCard: (id: string) => Promise<void>

  setSearchQuery: (query: string) => void
  setTagFilter: (tag: string | null) => void
  setDueFilter: (filter: DueFilter) => void
  setArchivedPanelOpen: (open: boolean) => void

  exportData: () => Promise<void>
  importData: (file: File) => Promise<void>
}

async function loadBoardContents(service: KanbanService, boardId: string) {
  const [columns, cards] = await Promise.all([service.listColumns(boardId), service.listCards(boardId)])
  return { columns, cards }
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  service: kanbanService,
  boards: [],
  columns: [],
  cards: [],
  activeBoardId: null,
  loading: true,
  searchQuery: '',
  tagFilter: null,
  dueFilter: 'all',
  archivedPanelOpen: false,

  init: async () => {
    const { service } = get()
    set({ loading: true })
    const boards = await service.listBoards()
    const activeBoardId = boards[0]?.id ?? null
    const { columns, cards } = activeBoardId
      ? await loadBoardContents(service, activeBoardId)
      : { columns: [], cards: [] }
    set({ boards, activeBoardId, columns, cards, loading: false })
  },

  /** Drops every loaded board and filter, for when the signed-in user goes away. */
  reset: () =>
    set({
      boards: [],
      columns: [],
      cards: [],
      activeBoardId: null,
      loading: true,
      searchQuery: '',
      tagFilter: null,
      dueFilter: 'all',
      archivedPanelOpen: false,
    }),

  selectBoard: async (boardId) => {
    const { service } = get()
    set({ loading: true })
    const { columns, cards } = await loadBoardContents(service, boardId)
    set({ activeBoardId: boardId, columns, cards, loading: false })
  },

  createBoard: async (name) => {
    const { service } = get()
    const board = await service.createBoard(name)
    set((state) => ({ boards: [...state.boards, board] }))
    await get().selectBoard(board.id)
    return board
  },

  renameBoard: async (id, name) => {
    const { service } = get()
    const updated = await service.renameBoard(id, name)
    set((state) => ({ boards: state.boards.map((b) => (b.id === id ? updated : b)) }))
  },

  deleteBoard: async (id) => {
    const { service } = get()
    await service.deleteBoard(id)
    set((state) => {
      const boards = state.boards.filter((b) => b.id !== id)
      const activeBoardId = state.activeBoardId === id ? (boards[0]?.id ?? null) : state.activeBoardId
      return { boards, activeBoardId }
    })
    const nextId = get().activeBoardId
    if (nextId) await get().selectBoard(nextId)
    else set({ columns: [], cards: [] })
  },

  createColumn: async (name) => {
    const { service, activeBoardId } = get()
    if (!activeBoardId) return
    const column = await service.createColumn(activeBoardId, name)
    set((state) => ({ columns: [...state.columns, column] }))
  },

  renameColumn: async (id, name) => {
    const { service } = get()
    const updated = await service.renameColumn(id, name)
    set((state) => ({ columns: state.columns.map((c) => (c.id === id ? updated : c)) }))
  },

  deleteColumn: async (id) => {
    const { service } = get()
    await service.deleteColumn(id)
    set((state) => ({
      columns: state.columns.filter((c) => c.id !== id),
      cards: state.cards.filter((c) => c.columnId !== id),
    }))
  },

  reorderColumns: async (orderedColumnIds) => {
    const { service, activeBoardId } = get()
    if (!activeBoardId) return
    const columns = await service.reorderColumns(activeBoardId, orderedColumnIds)
    set({ columns })
  },

  createCard: async (columnId, input) => {
    const { service } = get()
    const card = await service.createCard(columnId, input)
    set((state) => ({ cards: [...state.cards, card] }))
  },

  updateCard: async (id, input) => {
    const { service } = get()
    const updated = await service.updateCard(id, input)
    set((state) => ({ cards: state.cards.map((c) => (c.id === id ? updated : c)) }))
  },

  moveCard: async (id, toColumnId, toIndex) => {
    const { service } = get()
    const affected = await service.moveCard(id, toColumnId, toIndex)
    set((state) => {
      const affectedIds = new Set(affected.map((c) => c.id))
      const untouched = state.cards.filter((c) => !affectedIds.has(c.id))
      return { cards: [...untouched, ...affected] }
    })
  },

  deleteCard: async (id) => {
    const { service } = get()
    await service.deleteCard(id)
    set((state) => ({ cards: state.cards.filter((c) => c.id !== id) }))
  },

  archiveCard: async (id) => {
    await get().updateCard(id, { archived: true })
  },

  restoreCard: async (id) => {
    await get().updateCard(id, { archived: false })
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setTagFilter: (tag) => set({ tagFilter: tag }),
  setDueFilter: (filter) => set({ dueFilter: filter }),
  setArchivedPanelOpen: (open) => set({ archivedPanelOpen: open }),

  exportData: async () => {
    const { service } = get()
    const data = await service.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mini-kanban-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  },

  importData: async (file) => {
    const { service } = get()
    const text = await file.text()
    const data = JSON.parse(text)
    await service.importData(data)
    await get().init()
  },
}))
