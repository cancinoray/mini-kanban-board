import type { Board, Card, Column, KanbanExport, NewCardInput, UpdateCardInput } from '../types'
import { ApiError, apiRequest, DEFAULT_API_BASE_URL, pathSegment, type HttpMethod } from './httpClient'
import type { KanbanService } from './KanbanService'
import { notifySessionExpired } from './sessionExpiry'

/** Talks to the real backend; every call rides the session cookie. */
export class HttpKanbanService implements KanbanService {
  private baseUrl: string

  constructor(options: { baseUrl?: string } = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_API_BASE_URL
  }

  private async send<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    try {
      return await apiRequest<T>(path, { baseUrl: this.baseUrl, method, body })
    } catch (error) {
      // Every route here needs the session, so a 401 can only mean the backend
      // has stopped recognising it. The call still fails: the caller's
      // continuation is meaningless now that the board is about to disappear.
      if (error instanceof ApiError && error.status === 401) notifySessionExpired()
      throw error
    }
  }

  async listBoards(): Promise<Board[]> {
    return this.send<Board[]>('GET', '/boards')
  }

  async createBoard(name: string): Promise<Board> {
    return this.send<Board>('POST', '/boards', { name })
  }

  async renameBoard(id: string, name: string): Promise<Board> {
    return this.send<Board>('PATCH', `/boards/${pathSegment(id)}`, { name })
  }

  async deleteBoard(id: string): Promise<void> {
    return this.send<void>('DELETE', `/boards/${pathSegment(id)}`)
  }

  async listColumns(boardId: string): Promise<Column[]> {
    return this.send<Column[]>('GET', `/boards/${pathSegment(boardId)}/columns`)
  }

  async createColumn(boardId: string, name: string): Promise<Column> {
    return this.send<Column>('POST', `/boards/${pathSegment(boardId)}/columns`, { name })
  }

  async renameColumn(id: string, name: string): Promise<Column> {
    return this.send<Column>('PATCH', `/columns/${pathSegment(id)}`, { name })
  }

  async deleteColumn(id: string): Promise<void> {
    return this.send<void>('DELETE', `/columns/${pathSegment(id)}`)
  }

  async reorderColumns(boardId: string, orderedColumnIds: string[]): Promise<Column[]> {
    return this.send<Column[]>('POST', `/boards/${pathSegment(boardId)}/columns/reorder`, {
      orderedColumnIds,
    })
  }

  async listCards(boardId: string): Promise<Card[]> {
    return this.send<Card[]>('GET', `/boards/${pathSegment(boardId)}/cards`)
  }

  async createCard(columnId: string, input: NewCardInput): Promise<Card> {
    return this.send<Card>('POST', `/columns/${pathSegment(columnId)}/cards`, input)
  }

  async updateCard(id: string, input: UpdateCardInput): Promise<Card> {
    return this.send<Card>('PATCH', `/cards/${pathSegment(id)}`, input)
  }

  async moveCard(id: string, toColumnId: string, toIndex: number): Promise<Card[]> {
    return this.send<Card[]>('POST', `/cards/${pathSegment(id)}/move`, { toColumnId, toIndex })
  }

  async deleteCard(id: string): Promise<void> {
    return this.send<void>('DELETE', `/cards/${pathSegment(id)}`)
  }

  async exportData(): Promise<KanbanExport> {
    return this.send<KanbanExport>('GET', '/export')
  }

  async importData(data: KanbanExport): Promise<void> {
    return this.send<void>('POST', '/import', data)
  }
}
