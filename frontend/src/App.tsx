import { useEffect, useState } from 'react'
import { AccountMenu } from './components/AccountMenu'
import { AuthPage } from './components/AuthPage'
import { BoardView } from './components/BoardView'
import { BrandMark } from './components/BrandMark'
import { DarkModeToggle } from './components/DarkModeToggle'
import { TopBar } from './components/TopBar'
import { useAuthStore } from './store/useAuthStore'
import { useKanbanStore } from './store/useKanbanStore'

function App() {
  const authStatus = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const initAuth = useAuthStore((s) => s.init)

  const init = useKanbanStore((s) => s.init)
  const reset = useKanbanStore((s) => s.reset)
  const loading = useKanbanStore((s) => s.loading)
  const boards = useKanbanStore((s) => s.boards)
  const createBoard = useKanbanStore((s) => s.createBoard)

  const [newBoardName, setNewBoardName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    initAuth()
  }, [initAuth])

  // Boards belong to whoever is signed in: load them on sign-in, drop them on sign-out.
  useEffect(() => {
    if (user) init()
    else reset()
  }, [user, init, reset])

  if (authStatus === 'loading') return null
  if (!user) return <AuthPage />
  if (loading) return null

  if (boards.length === 0) {
    return (
      <div className="flex h-screen flex-col bg-bg">
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          <BrandMark />
          <div className="flex items-center gap-1">
            <AccountMenu />
            <DarkModeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-[13px] text-text-secondary">Create your first board to get started</p>
          {creating ? (
            <input
              autoFocus
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onBlur={() => {
                if (newBoardName.trim()) createBoard(newBoardName.trim())
                setCreating(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newBoardName.trim()) {
                  createBoard(newBoardName.trim())
                  setCreating(false)
                }
              }}
              placeholder="Board name"
              aria-label="New board name"
              className="h-10 rounded-md border border-border bg-surface px-3 text-[14px] text-text-primary outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="h-10 rounded-md bg-accent px-4 text-[13px] text-white"
            >
              + Add board
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-bg">
      <TopBar />
      <BoardView />
    </div>
  )
}

export default App
