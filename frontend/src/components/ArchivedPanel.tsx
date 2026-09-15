import { useEffect } from 'react'
import { useKanbanStore } from '../store/useKanbanStore'
import type { Card, Column } from '../types'

interface ArchivedPanelProps {
  cards: Card[]
  columns: Column[]
  onClose: () => void
}

export function ArchivedPanel({ cards, columns, onClose }: ArchivedPanelProps) {
  const restoreCard = useKanbanStore((s) => s.restoreCard)
  const deleteCard = useKanbanStore((s) => s.deleteCard)
  const columnName = (columnId: string) => columns.find((c) => c.id === columnId)?.name ?? ''

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="flex-1" onClick={onClose} role="presentation" />
      <aside
        aria-label="Archived cards"
        className="flex h-full w-96 flex-col border-l border-border bg-surface p-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-medium text-text-primary">Archived</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close archived cards"
            className="flex h-10 w-10 items-center justify-center rounded-md text-text-secondary hover:bg-accent-tint"
          >
            &times;
          </button>
        </div>

        <div className="mt-2 flex flex-1 flex-col gap-2 overflow-y-auto">
          {cards.length === 0 && (
            <p className="mt-4 text-[13px] text-text-secondary">Nothing archived yet</p>
          )}
          {cards.map((card) => (
            <div key={card.id} className="rounded-md border border-border p-3">
              <p className="text-[14px] text-text-primary">{card.title}</p>
              <p className="mt-1 text-[12px] text-text-secondary">{columnName(card.columnId)}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => restoreCard(card.id)}
                  className="h-8 rounded-md border border-border px-2 text-[12px] text-text-primary hover:bg-accent-tint"
                >
                  Restore
                </button>
                <button
                  type="button"
                  onClick={() => deleteCard(card.id)}
                  className="h-8 rounded-md px-2 text-[12px] text-warning hover:bg-accent-tint"
                >
                  Delete permanently
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
