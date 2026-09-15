import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useState } from 'react'
import { useKanbanStore, type DueFilter } from '../store/useKanbanStore'
import type { Card } from '../types'
import { isDueThisWeek, isOverdue } from '../utils/dates'
import { ArchivedPanel } from './ArchivedPanel'
import { CardDetailPanel } from './CardDetailPanel'
import { ColumnView } from './ColumnView'

function matchesFilters(
  card: Card,
  searchQuery: string,
  tagFilter: string | null,
  dueFilter: DueFilter,
): boolean {
  if (card.archived) return false
  if (tagFilter && !card.tags.includes(tagFilter)) return false
  if (dueFilter === 'overdue' && !isOverdue(card.dueDate)) return false
  if (dueFilter === 'week' && !isDueThisWeek(card.dueDate)) return false
  if (dueFilter === 'none' && card.dueDate) return false
  if (!searchQuery) return true
  const q = searchQuery.toLowerCase()
  return (
    card.title.toLowerCase().includes(q) ||
    card.tags.some((t) => t.toLowerCase().includes(q)) ||
    (isOverdue(card.dueDate) && 'overdue'.includes(q))
  )
}

export function BoardView() {
  const columns = useKanbanStore((s) => s.columns)
  const cards = useKanbanStore((s) => s.cards)
  const searchQuery = useKanbanStore((s) => s.searchQuery)
  const tagFilter = useKanbanStore((s) => s.tagFilter)
  const dueFilter = useKanbanStore((s) => s.dueFilter)
  const setTagFilter = useKanbanStore((s) => s.setTagFilter)
  const createColumn = useKanbanStore((s) => s.createColumn)
  const reorderColumns = useKanbanStore((s) => s.reorderColumns)
  const moveCard = useKanbanStore((s) => s.moveCard)
  const archivedPanelOpen = useKanbanStore((s) => s.archivedPanelOpen)
  const setArchivedPanelOpen = useKanbanStore((s) => s.setArchivedPanelOpen)

  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const openCard = cards.find((c) => c.id === openCardId) ?? null
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Columns and cards are both sortable within the same DndContext, so without this,
  // closestCenter can resolve a card drag onto a whole column (or a column drag onto a
  // card) instead of the peer it's actually over. Restrict each drag to same-kind targets.
  const collisionDetection: CollisionDetection = (args) => {
    const activeType = args.active.data.current?.type
    const wantedTypes = activeType === 'card' ? ['card', 'column-drop'] : ['column']
    const sameKindTargets = args.droppableContainers.filter((container) =>
      wantedTypes.includes(container.data.current?.type as string),
    )
    const collisions = closestCenter({ ...args, droppableContainers: sameKindTargets })
    if (collisions.length > 0) return collisions
    return closestCenter(args)
  }

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order)
  const cardsByColumn = (columnId: string) =>
    cards
      .filter((c) => c.columnId === columnId && matchesFilters(c, searchQuery, tagFilter, dueFilter))
      .sort((a, b) => a.order - b.order)

  const archivedCards = cards.filter((c) => c.archived)

  const submitNewColumn = async () => {
    const name = newColumnName.trim()
    if (name) await createColumn(name)
    setNewColumnName('')
    setAddingColumn(false)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    if (active.data.current?.type === 'column') {
      if (active.id === over.id) return
      const ids = sortedColumns.map((c) => c.id)
      const fromIndex = ids.indexOf(String(active.id))
      const toIndex = ids.indexOf(String(over.id))
      if (fromIndex === -1 || toIndex === -1) return
      const reordered = [...ids]
      reordered.splice(fromIndex, 1)
      reordered.splice(toIndex, 0, String(active.id))
      reorderColumns(reordered)
      return
    }

    if (active.data.current?.type === 'card') {
      const cardId = String(active.id)
      const overData = over.data.current

      let targetColumnId: string
      let targetIndex: number

      if (overData?.type === 'card') {
        targetColumnId = overData.columnId as string
        const siblings = cardsByColumn(targetColumnId)
        targetIndex = siblings.findIndex((c) => c.id === over.id)
        if (targetIndex === -1) targetIndex = siblings.length
      } else if (overData?.type === 'column-drop') {
        targetColumnId = overData.columnId as string
        targetIndex = cardsByColumn(targetColumnId).length
      } else {
        return
      }

      moveCard(cardId, targetColumnId, targetIndex)
    }
  }

  if (sortedColumns.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-[13px] text-text-secondary">Create your first column to get started</p>
        <button
          type="button"
          onClick={() => setAddingColumn(true)}
          className="h-10 rounded-md bg-accent px-4 text-[13px] text-white"
        >
          + Add column
        </button>
        {addingColumn && (
          <input
            autoFocus
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            onBlur={submitNewColumn}
            onKeyDown={(e) => e.key === 'Enter' && submitNewColumn()}
            placeholder="Column name"
            aria-label="New column name"
            className="h-10 rounded-md border border-border bg-surface px-2 text-[14px] text-text-primary outline-none"
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-x-auto p-6">
      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd}>
        <SortableContext items={sortedColumns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex items-start gap-8">
            {sortedColumns.map((column) => (
              <ColumnView
                key={column.id}
                column={column}
                cards={cardsByColumn(column.id)}
                onOpenCard={(card) => setOpenCardId(card.id)}
                onTagClick={(tag) => setTagFilter(tagFilter === tag ? null : tag)}
              />
            ))}

            <div className="w-40 shrink-0 pt-1">
              {addingColumn ? (
                <input
                  autoFocus
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onBlur={submitNewColumn}
                  onKeyDown={(e) => e.key === 'Enter' && submitNewColumn()}
                  placeholder="Column name"
                  aria-label="New column name"
                  className="h-10 w-full rounded-md border border-border bg-surface px-2 text-[14px] text-text-primary outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingColumn(true)}
                  className="h-10 rounded-md px-2 text-[14px] font-medium text-text-secondary hover:bg-accent-tint"
                >
                  + Column
                </button>
              )}
            </div>
          </div>
        </SortableContext>
      </DndContext>

      {openCard && <CardDetailPanel card={openCard} onClose={() => setOpenCardId(null)} />}

      {archivedPanelOpen && (
        <ArchivedPanel
          cards={archivedCards}
          columns={sortedColumns}
          onClose={() => setArchivedPanelOpen(false)}
        />
      )}
    </div>
  )
}
