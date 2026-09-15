import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { LocalStorageKanbanService } from './services/localStorageKanbanService'
import { MockAuthService } from './services/mockAuthService'
import { useAuthStore } from './store/useAuthStore'
import { useKanbanStore } from './store/useKanbanStore'

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear()
    const auth = new MockAuthService({ usersKey: 'test:app:users', sessionKey: 'test:app:session' })
    const user = await auth.register({ name: 'Ray', email: 'ray@example.com', password: 'password123' })
    useAuthStore.setState({ service: auth, user, status: 'ready' })
    useKanbanStore.setState({
      service: new LocalStorageKanbanService({ storageKey: 'test:app' }),
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

  it('shows the empty-board state on first run', async () => {
    render(<App />)
    expect(await screen.findByText('Create your first board to get started')).toBeInTheDocument()
  })

  it('sends the user back to sign-in after signing out', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
  })

  it('lets the user create the first board and then add a column and a card', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: '+ Add board' }))
    await user.type(screen.getByLabelText('New board name'), 'Work')
    await user.keyboard('{Enter}')

    expect(await screen.findByText('Work')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+ Add column' }))
    await user.type(screen.getByLabelText('New column name'), 'To do')
    await user.keyboard('{Enter}')

    expect(await screen.findByText('To do')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+ Add card' }))
    await user.type(screen.getByLabelText('New card title'), 'Write tests')
    await user.keyboard('{Enter}')

    expect(await screen.findByText('Write tests')).toBeInTheDocument()
  })

  it('archives a card and can restore it from the Archived panel', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: '+ Add board' }))
    await user.type(screen.getByLabelText('New board name'), 'Work')
    await user.keyboard('{Enter}')
    await user.click(await screen.findByRole('button', { name: '+ Add column' }))
    await user.type(screen.getByLabelText('New column name'), 'To do')
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('button', { name: '+ Add card' }))
    await user.type(screen.getByLabelText('New card title'), 'Write tests')
    await user.keyboard('{Enter}')
    await screen.findByText('Write tests')

    await user.click(screen.getByRole('button', { name: 'Archive card Write tests' }))
    await user.click(screen.getByRole('button', { name: 'Archive' }))

    expect(screen.queryByText('Write tests')).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Archived (1)' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Archived (1)' }))
    expect(await screen.findByRole('button', { name: 'Restore' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Restore' }))

    expect(await screen.findByText('Write tests')).toBeInTheDocument()
  })

  it('filters the board by clicking a tag, and clears the filter from the chip', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: '+ Add board' }))
    await user.type(screen.getByLabelText('New board name'), 'Work')
    await user.keyboard('{Enter}')
    await user.click(await screen.findByRole('button', { name: '+ Add column' }))
    await user.type(screen.getByLabelText('New column name'), 'To do')
    await user.keyboard('{Enter}')

    await user.click(screen.getByRole('button', { name: '+ Add card' }))
    await user.type(screen.getByLabelText('New card title'), 'Tagged task')
    await user.keyboard('{Enter}')
    await screen.findByText('Tagged task')
    await user.click(screen.getByRole('button', { name: '+ Add card' }))
    await user.type(screen.getByLabelText('New card title'), 'Untagged task')
    await user.keyboard('{Enter}')
    await screen.findByText('Untagged task')

    await user.click(screen.getByText('Tagged task'))
    await user.type(screen.getByLabelText('Add tag'), 'urgent')
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('button', { name: 'Close card details' }))

    await user.click(screen.getByText('urgent'))

    expect(screen.getByText('Tagged task')).toBeInTheDocument()
    expect(screen.queryByText('Untagged task')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tag: urgent/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Tag: urgent/ }))
    expect(screen.getByText('Untagged task')).toBeInTheDocument()
  })
})
