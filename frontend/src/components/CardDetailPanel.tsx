import { useEffect, useState } from 'react'
import { useKanbanStore } from '../store/useKanbanStore'
import type { Card } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { TagPill } from './TagPill'

interface CardDetailPanelProps {
  card: Card
  onClose: () => void
}

export function CardDetailPanel({ card, onClose }: CardDetailPanelProps) {
  const updateCard = useKanbanStore((s) => s.updateCard)
  const deleteCard = useKanbanStore((s) => s.deleteCard)
  const archiveCard = useKanbanStore((s) => s.archiveCard)

  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description)
  const [dueDate, setDueDate] = useState(card.dueDate ?? '')
  const [tagDraft, setTagDraft] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingArchive, setConfirmingArchive] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmingDelete && !confirmingArchive) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmingDelete, confirmingArchive, onClose])

  const commitTitle = () => {
    const trimmed = title.trim()
    if (trimmed && trimmed !== card.title) updateCard(card.id, { title: trimmed })
    else setTitle(card.title)
  }

  const commitDescription = () => {
    if (description !== card.description) updateCard(card.id, { description })
  }

  const commitDueDate = () => {
    const value = dueDate || null
    if (value !== card.dueDate) updateCard(card.id, { dueDate: value })
  }

  const addTag = () => {
    const tag = tagDraft.trim()
    if (tag && !card.tags.includes(tag)) {
      updateCard(card.id, { tags: [...card.tags, tag] })
    }
    setTagDraft('')
  }

  const removeTag = (tag: string) => {
    updateCard(card.id, { tags: card.tags.filter((t) => t !== tag) })
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Card details"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto rounded-md border border-border bg-surface p-4 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close card details"
            className="flex h-10 w-10 items-center justify-center rounded-md text-text-secondary hover:bg-accent-tint"
          >
            &times;
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          aria-label="Card title"
          className="mt-2 rounded-md px-2 py-1 text-[14px] font-normal text-text-primary outline-none focus-visible:bg-accent-tint"
        />

        <label className="mt-4 text-[12px] text-text-secondary" htmlFor="card-due-date">
          Due date
        </label>
        <input
          id="card-due-date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          onBlur={commitDueDate}
          className="mt-1 h-10 w-40 rounded-md border border-border bg-bg px-2 text-[13px] text-text-primary outline-none"
        />

        <span className="mt-4 text-[12px] text-text-secondary">Tags</span>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {card.tags.map((tag) => (
            <TagPill key={tag} label={tag} onRemove={() => removeTag(tag)} />
          ))}
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              }
            }}
            onBlur={addTag}
            placeholder="Add tag…"
            aria-label="Add tag"
            className="h-7 w-24 rounded-md border border-border bg-bg px-2 text-[12px] text-text-primary outline-none"
          />
        </div>

        <label className="mt-4 text-[12px] text-text-secondary" htmlFor="card-description">
          Description
        </label>
        <textarea
          id="card-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={commitDescription}
          rows={8}
          className="mt-1 flex-1 resize-none rounded-md border border-border bg-bg p-2 text-[13px] leading-relaxed text-text-primary outline-none"
        />

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmingArchive(true)}
            className="h-10 flex-1 rounded-md border border-border text-[13px] text-text-secondary hover:bg-accent-tint"
          >
            Archive card
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="h-10 flex-1 rounded-md border border-border text-[13px] text-warning hover:bg-accent-tint"
          >
            Delete card
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this card?"
          message="This can't be undone."
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => {
            deleteCard(card.id)
            setConfirmingDelete(false)
            onClose()
          }}
        />
      )}

      {confirmingArchive && (
        <ConfirmDialog
          title="Archive this card?"
          message="It'll move out of the board. You can restore it from Archived at any time."
          confirmLabel="Archive"
          onCancel={() => setConfirmingArchive(false)}
          onConfirm={() => {
            archiveCard(card.id)
            setConfirmingArchive(false)
            onClose()
          }}
        />
      )}
    </div>
  )
}
