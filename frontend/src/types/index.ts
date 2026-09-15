export interface Board {
  id: string
  name: string
  order: number
}

export interface Column {
  id: string
  boardId: string
  name: string
  order: number
}

export interface Card {
  id: string
  columnId: string
  title: string
  description: string
  dueDate: string | null
  tags: string[]
  order: number
  archived: boolean
}

export interface KanbanExport {
  boards: Board[]
  columns: Column[]
  cards: Card[]
  exportedAt: string
}

export interface NewCardInput {
  title: string
  description?: string
  dueDate?: string | null
  tags?: string[]
}

export interface UpdateCardInput {
  title?: string
  description?: string
  dueDate?: string | null
  tags?: string[]
  archived?: boolean
}
