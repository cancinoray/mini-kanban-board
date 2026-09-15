import { useRef, useState } from 'react'
import { useKanbanStore } from '../store/useKanbanStore'

export function BoardSwitcher() {
  const boards = useKanbanStore((s) => s.boards)
  const activeBoardId = useKanbanStore((s) => s.activeBoardId)
  const selectBoard = useKanbanStore((s) => s.selectBoard)
  const createBoard = useKanbanStore((s) => s.createBoard)

  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const activeBoard = boards.find((b) => b.id === activeBoardId)

  const submitNewBoard = async () => {
    const name = newName.trim()
    if (!name) {
      setCreating(false)
      return
    }
    await createBoard(name)
    setNewName('')
    setCreating(false)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-10 items-center gap-1 rounded-md px-2 text-[18px] font-medium text-text-primary hover:bg-accent-tint"
      >
        {activeBoard?.name ?? 'No board'}
        <span aria-hidden="true" className="text-text-secondary">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-11 z-40 w-56 rounded-md border border-border bg-surface p-1 shadow-lg"
        >
          {boards.map((board, index) => (
            <button
              key={board.id}
              type="button"
              role="option"
              aria-selected={board.id === activeBoardId}
              onClick={() => {
                selectBoard(board.id)
                setOpen(false)
              }}
              className={`flex w-full items-baseline gap-2 rounded-md px-2 py-2 text-left text-[14px] hover:bg-accent-tint ${
                board.id === activeBoardId ? 'bg-accent-tint text-text-primary' : 'text-text-secondary'
              }`}
            >
              <span className="w-4 shrink-0 tabular-nums text-[12px] text-text-secondary">
                {String(index + 1).padStart(2, '0')}
              </span>
              {board.name}
            </button>
          ))}

          <div className="mt-1 border-t border-border pt-1">
            {creating ? (
              <input
                ref={inputRef}
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={submitNewBoard}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitNewBoard()
                  if (e.key === 'Escape') {
                    setCreating(false)
                    setNewName('')
                  }
                }}
                placeholder="Board name"
                className="w-full rounded-md border border-border bg-bg px-2 py-2 text-[14px] text-text-primary outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="block w-full rounded-md px-2 py-2 text-left text-[14px] text-text-secondary hover:bg-accent-tint"
              >
                + New board
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
