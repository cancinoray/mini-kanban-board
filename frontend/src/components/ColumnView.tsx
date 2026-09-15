import { useSortable } from '@dnd-kit/sortable'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { useKanbanStore } from '../store/useKanbanStore'
import type { Card, Column } from '../types'
import { CardItem } from './CardItem'
import { ConfirmDialog } from './ConfirmDialog'

interface ColumnViewProps {
  column: Column
  cards: Card[]
  onOpenCard: (card: Card) => void
  onTagClick: (tag: string) => void
}

export function ColumnView({ column, cards, onOpenCard, onTagClick }: ColumnViewProps) {
  const renameColumn = useKanbanStore((s) => s.renameColumn)
  const deleteColumn = useKanbanStore((s) => s.deleteColumn)
  const createCard = useKanbanStore((s) => s.createCard)
  const archiveCard = useKanbanStore((s) => s.archiveCard)

  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(column.name)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [addingCard, setAddingCard] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [archivingCard, setArchivingCard] = useState<Card | null>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'column' },
  })
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `column-drop-${column.id}`,
    data: { type: 'column-drop', columnId: column.id },
  })

  const style = { transform: CSS.Transform.toString(transform), transition }

  const commitName = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== column.name) renameColumn(column.id, trimmed)
    else setName(column.name)
    setEditingName(false)
  }

  const submitNewCard = async () => {
    const title = newCardTitle.trim()
    if (title) await createCard(column.id, { title })
    setNewCardTitle('')
    setAddingCard(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex w-72 shrink-0 flex-col ${isDragging ? 'opacity-50' : ''}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab pb-2">
        {editingName ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === 'Enter' && commitName()}
            className="w-full rounded-md border border-border bg-bg px-1 text-[14px] font-medium text-text-primary outline-none"
          />
        ) : (
          <div className="flex items-center gap-2">
            <h2
              onClick={() => setEditingName(true)}
              className="shrink-0 text-[14px] font-medium text-text-primary"
            >
              {column.name}
            </h2>
            <span
              aria-hidden="true"
              className="mt-1 flex-1 border-b border-dotted border-border"
            />
            <span className="shrink-0 text-[12px] tabular-nums text-text-secondary">{cards.length}</span>
            <button
              type="button"
              aria-label={`Delete column ${column.name}`}
              onClick={() => setConfirmingDelete(true)}
              className="shrink-0 text-[12px] text-text-secondary hover:text-warning"
            >
              &times;
            </button>
          </div>
        )}
        <div className="mt-2 border-t border-border" />
      </div>

      <div ref={setDroppableRef} className="flex min-h-10 flex-1 flex-col gap-2">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onOpen={() => onOpenCard(card)}
              onArchiveRequest={() => setArchivingCard(card)}
              onTagClick={onTagClick}
            />
          ))}
        </SortableContext>

        {cards.length === 0 && !addingCard && (
          <p className="text-[12px] text-text-secondary">No cards yet</p>
        )}
      </div>

      {addingCard ? (
        <input
          autoFocus
          value={newCardTitle}
          onChange={(e) => setNewCardTitle(e.target.value)}
          onBlur={submitNewCard}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitNewCard()
            if (e.key === 'Escape') {
              setAddingCard(false)
              setNewCardTitle('')
            }
          }}
          placeholder="Card title"
          aria-label="New card title"
          className="mt-2 h-10 rounded-md border border-border bg-surface px-2 text-[14px] text-text-primary outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAddingCard(true)}
          className="mt-2 h-10 rounded-md text-left text-[13px] text-text-secondary hover:bg-accent-tint"
        >
          + Add card
        </button>
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title={`Delete "${column.name}"?`}
          message="All cards in this column will be deleted too. This can't be undone."
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => {
            deleteColumn(column.id)
            setConfirmingDelete(false)
          }}
        />
      )}

      {archivingCard && (
        <ConfirmDialog
          title="Archive this card?"
          message="It'll move out of the board. You can restore it from Archived at any time."
          confirmLabel="Archive"
          onCancel={() => setArchivingCard(null)}
          onConfirm={() => {
            archiveCard(archivingCard.id)
            setArchivingCard(null)
          }}
        />
      )}
    </div>
  )
}
