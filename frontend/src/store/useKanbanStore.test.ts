import { act } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageKanbanService } from '../services/localStorageKanbanService'
import { useKanbanStore } from './useKanbanStore'

describe('useKanbanStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useKanbanStore.setState({
      service: new LocalStorageKanbanService({ storageKey: 'test:store' }),
      boards: [],
      columns: [],
      cards: [],
      activeBoardId: null,
      loading: true,
      searchQuery: '',
      tagFilter: null,
      dueFilter: 'all',
      archivedPanelOpen: false,
    })
  })

  it('init with no data leaves the board list empty', async () => {
    await act(async () => {
      await useKanbanStore.getState().init()
    })
    expect(useKanbanStore.getState().boards).toEqual([])
    expect(useKanbanStore.getState().loading).toBe(false)
  })

  it('creating a board makes it active and loads its (empty) columns', async () => {
    await act(async () => {
      await useKanbanStore.getState().init()
      await useKanbanStore.getState().createBoard('Work')
    })
    const state = useKanbanStore.getState()
    expect(state.boards).toHaveLength(1)
    expect(state.activeBoardId).toBe(state.boards[0].id)
    expect(state.columns).toEqual([])
  })

  it('creating a column and a card updates state without a manual reload', async () => {
    await act(async () => {
      await useKanbanStore.getState().init()
      await useKanbanStore.getState().createBoard('Work')
      await useKanbanStore.getState().createColumn('To do')
    })
    const columnId = useKanbanStore.getState().columns[0].id

    await act(async () => {
      await useKanbanStore.getState().createCard(columnId, { title: 'Write tests' })
    })

    expect(useKanbanStore.getState().cards).toHaveLength(1)
    expect(useKanbanStore.getState().cards[0].title).toBe('Write tests')
  })

  it('moving a card updates its columnId in state', async () => {
    await act(async () => {
      await useKanbanStore.getState().init()
      await useKanbanStore.getState().createBoard('Work')
      await useKanbanStore.getState().createColumn('To do')
      await useKanbanStore.getState().createColumn('Doing')
    })
    const [todo, doing] = useKanbanStore.getState().columns

    await act(async () => {
      await useKanbanStore.getState().createCard(todo.id, { title: 'Task' })
    })
    const card = useKanbanStore.getState().cards[0]

    await act(async () => {
      await useKanbanStore.getState().moveCard(card.id, doing.id, 0)
    })

    expect(useKanbanStore.getState().cards.find((c) => c.id === card.id)?.columnId).toBe(doing.id)
  })

  it('archiving a card marks it archived, restoring it clears the flag', async () => {
    await act(async () => {
      await useKanbanStore.getState().init()
      await useKanbanStore.getState().createBoard('Work')
      await useKanbanStore.getState().createColumn('To do')
    })
    const columnId = useKanbanStore.getState().columns[0].id

    await act(async () => {
      await useKanbanStore.getState().createCard(columnId, { title: 'Task' })
    })
    const card = useKanbanStore.getState().cards[0]

    await act(async () => {
      await useKanbanStore.getState().archiveCard(card.id)
    })
    expect(useKanbanStore.getState().cards.find((c) => c.id === card.id)?.archived).toBe(true)

    await act(async () => {
      await useKanbanStore.getState().restoreCard(card.id)
    })
    expect(useKanbanStore.getState().cards.find((c) => c.id === card.id)?.archived).toBe(false)
  })

  it('deleting a board clears its cards and columns from state', async () => {
    await act(async () => {
      await useKanbanStore.getState().init()
      await useKanbanStore.getState().createBoard('Work')
      await useKanbanStore.getState().createColumn('To do')
    })
    const boardId = useKanbanStore.getState().activeBoardId!

    await act(async () => {
      await useKanbanStore.getState().deleteBoard(boardId)
    })

    expect(useKanbanStore.getState().boards).toEqual([])
    expect(useKanbanStore.getState().columns).toEqual([])
  })
})
