import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageKanbanService } from './localStorageKanbanService'

describe('LocalStorageKanbanService', () => {
  let service: LocalStorageKanbanService

  beforeEach(() => {
    localStorage.clear()
    service = new LocalStorageKanbanService({ storageKey: 'test:kanban' })
  })

  it('starts with no boards', async () => {
    expect(await service.listBoards()).toEqual([])
  })

  it('creates and lists boards in order', async () => {
    const a = await service.createBoard('Work')
    const b = await service.createBoard('Personal')
    const boards = await service.listBoards()
    expect(boards.map((x) => x.id)).toEqual([a.id, b.id])
    expect(boards.map((x) => x.name)).toEqual(['Work', 'Personal'])
  })

  it('renames a board', async () => {
    const board = await service.createBoard('Work')
    const renamed = await service.renameBoard(board.id, 'Projects')
    expect(renamed.name).toBe('Projects')
    expect((await service.listBoards())[0].name).toBe('Projects')
  })

  it('deleting a board cascades to its columns and cards', async () => {
    const board = await service.createBoard('Work')
    const column = await service.createColumn(board.id, 'To do')
    await service.createCard(column.id, { title: 'Write tests' })

    await service.deleteBoard(board.id)

    expect(await service.listColumns(board.id)).toEqual([])
    expect(await service.listCards(board.id)).toEqual([])
  })

  it('creates columns scoped to a board with incrementing order', async () => {
    const board = await service.createBoard('Work')
    const c1 = await service.createColumn(board.id, 'To do')
    const c2 = await service.createColumn(board.id, 'Doing')
    expect(c1.order).toBe(0)
    expect(c2.order).toBe(1)
  })

  it('deleting a column cascades to its cards', async () => {
    const board = await service.createBoard('Work')
    const column = await service.createColumn(board.id, 'To do')
    const card = await service.createCard(column.id, { title: 'Task' })

    await service.deleteColumn(column.id)

    expect(await service.listCards(board.id)).not.toContainEqual(expect.objectContaining({ id: card.id }))
  })

  it('reorders columns', async () => {
    const board = await service.createBoard('Work')
    const c1 = await service.createColumn(board.id, 'To do')
    const c2 = await service.createColumn(board.id, 'Doing')

    await service.reorderColumns(board.id, [c2.id, c1.id])
    const columns = await service.listColumns(board.id)
    expect(columns.map((c) => c.id)).toEqual([c2.id, c1.id])
  })

  it('creates a card with defaults filled in', async () => {
    const board = await service.createBoard('Work')
    const column = await service.createColumn(board.id, 'To do')
    const card = await service.createCard(column.id, { title: 'Task' })

    expect(card.title).toBe('Task')
    expect(card.description).toBe('')
    expect(card.dueDate).toBeNull()
    expect(card.tags).toEqual([])
    expect(card.archived).toBe(false)
  })

  it('archives and restores a card via updateCard', async () => {
    const board = await service.createBoard('Work')
    const column = await service.createColumn(board.id, 'To do')
    const card = await service.createCard(column.id, { title: 'Task' })

    const archived = await service.updateCard(card.id, { archived: true })
    expect(archived.archived).toBe(true)

    const restored = await service.updateCard(card.id, { archived: false })
    expect(restored.archived).toBe(false)
  })

  it('updates a card', async () => {
    const board = await service.createBoard('Work')
    const column = await service.createColumn(board.id, 'To do')
    const card = await service.createCard(column.id, { title: 'Task' })

    const updated = await service.updateCard(card.id, { title: 'Renamed', tags: ['urgent'] })
    expect(updated.title).toBe('Renamed')
    expect(updated.tags).toEqual(['urgent'])
  })

  it('moves a card within the same column', async () => {
    const board = await service.createBoard('Work')
    const column = await service.createColumn(board.id, 'To do')
    const c1 = await service.createCard(column.id, { title: 'First' })
    const c2 = await service.createCard(column.id, { title: 'Second' })

    await service.moveCard(c2.id, column.id, 0)

    const cards = await service.listCards(board.id)
    const ordered = cards.filter((c) => c.columnId === column.id).sort((a, b) => a.order - b.order)
    expect(ordered.map((c) => c.id)).toEqual([c2.id, c1.id])
  })

  it('moves a card across columns', async () => {
    const board = await service.createBoard('Work')
    const todo = await service.createColumn(board.id, 'To do')
    const doing = await service.createColumn(board.id, 'Doing')
    const card = await service.createCard(todo.id, { title: 'Task' })

    await service.moveCard(card.id, doing.id, 0)

    const cards = await service.listCards(board.id)
    const moved = cards.find((c) => c.id === card.id)
    expect(moved?.columnId).toBe(doing.id)
    expect(await service.listCards(board.id)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: card.id, columnId: doing.id })]),
    )
  })

  it('deletes a card', async () => {
    const board = await service.createBoard('Work')
    const column = await service.createColumn(board.id, 'To do')
    const card = await service.createCard(column.id, { title: 'Task' })

    await service.deleteCard(card.id)

    expect(await service.listCards(board.id)).toEqual([])
  })

  it('exports and imports the full dataset', async () => {
    const board = await service.createBoard('Work')
    const column = await service.createColumn(board.id, 'To do')
    await service.createCard(column.id, { title: 'Task' })

    const exported = await service.exportData()

    const fresh = new LocalStorageKanbanService({ storageKey: 'test:kanban:imported' })
    await fresh.importData(exported)

    expect(await fresh.listBoards()).toEqual(exported.boards)
    expect(await fresh.listCards(board.id)).toEqual(exported.cards)
  })

  it('throws when acting on a board that does not exist', async () => {
    await expect(service.createColumn('missing-board', 'To do')).rejects.toThrow()
  })
})
