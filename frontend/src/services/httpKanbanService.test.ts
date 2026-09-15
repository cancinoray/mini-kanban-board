import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Card, Column } from '../types'
import { ApiError } from './httpClient'
import { HttpKanbanService } from './httpKanbanService'
import { onSessionExpired } from './sessionExpiry'

const BASE_URL = 'http://api.test'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const noContentResponse = () => new Response(null, { status: 204 })

const board = { id: 'b1', name: 'Work', order: 0 }
const column: Column = { id: 'c1', boardId: 'b1', name: 'To do', order: 0 }
const card: Card = {
  id: 'k1',
  columnId: 'c1',
  title: 'Write tests',
  description: '',
  dueDate: null,
  tags: [],
  order: 0,
  archived: false,
}

describe('HttpKanbanService', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let onExpired = vi.fn<() => void>()
  let unsubscribe: () => void
  let service: HttpKanbanService

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    onExpired = vi.fn<() => void>()
    unsubscribe = onSessionExpired(onExpired)
    service = new HttpKanbanService({ baseUrl: BASE_URL })
  })

  afterEach(() => {
    unsubscribe()
    vi.unstubAllGlobals()
  })

  it('lists boards from GET /boards', async () => {
    fetchMock.mockResolvedValue(jsonResponse([board]))

    await expect(service.listBoards()).resolves.toEqual([board])
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/boards`,
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('creates a board by POSTing its name', async () => {
    fetchMock.mockResolvedValue(jsonResponse(board, 201))

    await expect(service.createBoard('Work')).resolves.toEqual(board)
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/boards`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Work' }),
        credentials: 'include',
      }),
    )
  })

  it('renames a board with PATCH /boards/{id}', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...board, name: 'Projects' }))

    await expect(service.renameBoard('b1', 'Projects')).resolves.toMatchObject({ name: 'Projects' })
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/boards/b1`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Projects' }) }),
    )
  })

  it('deletes a board and resolves without a body', async () => {
    fetchMock.mockResolvedValue(noContentResponse())

    await expect(service.deleteBoard('b1')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/boards/b1`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('lists a board’s columns from GET /boards/{id}/columns', async () => {
    fetchMock.mockResolvedValue(jsonResponse([column]))

    await expect(service.listColumns('b1')).resolves.toEqual([column])
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/boards/b1/columns`,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('creates a column on a board', async () => {
    fetchMock.mockResolvedValue(jsonResponse(column, 201))

    await expect(service.createColumn('b1', 'To do')).resolves.toEqual(column)
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/boards/b1/columns`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'To do' }) }),
    )
  })

  it('renames and deletes a column by its own id', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...column, name: 'Doing' }))
    await service.renameColumn('c1', 'Doing')
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BASE_URL}/columns/c1`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Doing' }) }),
    )

    fetchMock.mockResolvedValueOnce(noContentResponse())
    await service.deleteColumn('c1')
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BASE_URL}/columns/c1`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('reorders columns by POSTing the full new order', async () => {
    fetchMock.mockResolvedValue(jsonResponse([column]))

    await service.reorderColumns('b1', ['c2', 'c1'])
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/boards/b1/columns/reorder`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ orderedColumnIds: ['c2', 'c1'] }),
      }),
    )
  })

  it('lists a board’s cards from GET /boards/{id}/cards', async () => {
    fetchMock.mockResolvedValue(jsonResponse([card]))

    await expect(service.listCards('b1')).resolves.toEqual([card])
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/boards/b1/cards`,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('creates a card in a column, sending only the fields it was given', async () => {
    fetchMock.mockResolvedValue(jsonResponse(card, 201))

    await service.createCard('c1', { title: 'Write tests' })
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/columns/c1/cards`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'Write tests' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  it('updates a card with PATCH /cards/{id}', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...card, archived: true }))

    await expect(service.updateCard('k1', { archived: true })).resolves.toMatchObject({
      archived: true,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/cards/k1`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ archived: true }) }),
    )
  })

  it('clears a due date by sending null, not by omitting the field', async () => {
    fetchMock.mockResolvedValue(jsonResponse(card))

    await service.updateCard('k1', { dueDate: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/cards/k1`,
      expect.objectContaining({ body: JSON.stringify({ dueDate: null }) }),
    )
  })

  it('moves a card and returns the affected cards', async () => {
    const moved = { ...card, columnId: 'c2' }
    fetchMock.mockResolvedValue(jsonResponse([moved]))

    await expect(service.moveCard('k1', 'c2', 0)).resolves.toEqual([moved])
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/cards/k1/move`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ toColumnId: 'c2', toIndex: 0 }),
      }),
    )
  })

  it('deletes a card', async () => {
    fetchMock.mockResolvedValue(noContentResponse())

    await expect(service.deleteCard('k1')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/cards/k1`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('exports and imports the full dataset', async () => {
    const snapshot = { boards: [board], columns: [column], cards: [card], exportedAt: '2026-01-01T00:00:00Z' }
    fetchMock.mockResolvedValueOnce(jsonResponse(snapshot))

    await expect(service.exportData()).resolves.toEqual(snapshot)
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BASE_URL}/export`,
      expect.objectContaining({ method: 'GET' }),
    )

    fetchMock.mockResolvedValueOnce(noContentResponse())
    await expect(service.importData(snapshot)).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${BASE_URL}/import`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(snapshot) }),
    )
  })

  it('escapes ids so they cannot break out of their path segment', async () => {
    fetchMock.mockResolvedValue(jsonResponse(board))

    await service.renameBoard('a/b', 'Work')
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/boards/a%2Fb`,
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('surfaces the backend’s error message and status', async () => {
    // A Response body can only be read once, so hand every call a fresh one.
    fetchMock.mockImplementation(async () => jsonResponse({ message: 'Board not found' }, 404))

    await expect(service.listColumns('missing')).rejects.toBeInstanceOf(ApiError)
    await expect(service.listColumns('missing')).rejects.toMatchObject({
      status: 404,
      message: 'Board not found',
    })
  })

  it('announces a dead session when a board call comes back 401', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ message: 'No active session' }, 401))

    await expect(service.listBoards()).rejects.toMatchObject({ status: 401 })
    expect(onExpired).toHaveBeenCalledTimes(1)
  })

  it('leaves other failures alone', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ message: 'Board not found' }, 404))

    await expect(service.listBoards()).rejects.toBeInstanceOf(ApiError)
    expect(onExpired).not.toHaveBeenCalled()
  })
})
