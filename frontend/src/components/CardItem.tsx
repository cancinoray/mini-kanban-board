import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '../types'
import { formatDueDate, isOverdue } from '../utils/dates'
import { TagPill } from './TagPill'

interface CardItemProps {
  card: Card
  onOpen: () => void
  onArchiveRequest: () => void
  onTagClick: (tag: string) => void
}

export function CardItem({ card, onOpen, onArchiveRequest, onTagClick }: CardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', columnId: card.columnId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen()
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open card ${card.title}`}
      className={`group relative min-h-10 cursor-grab rounded-md border bg-surface p-3 pr-8 text-left transition-shadow ${
        isDragging ? 'scale-[1.02] border-transparent shadow-lg' : 'border-border'
      }`}
    >
      <button
        type="button"
        aria-label={`Archive card ${card.title}`}
        title="Mark as done and archive"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onArchiveRequest()
        }}
        className="absolute right-2.5 top-3 h-3.5 w-3.5 rounded-full border border-border opacity-0 transition-opacity group-hover:opacity-100 hover:border-accent hover:bg-accent focus-visible:opacity-100"
      />

      <p className="text-[14px] font-normal text-text-primary">{card.title}</p>
      {(card.tags.length > 0 || card.dueDate) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {card.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onTagClick(tag)
              }}
            >
              <TagPill label={tag} />
            </button>
          ))}
          {card.dueDate && (
            <span
              className={`text-[12px] tabular-nums ${isOverdue(card.dueDate) ? 'text-warning' : 'text-text-secondary'}`}
            >
              due {formatDueDate(card.dueDate)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
