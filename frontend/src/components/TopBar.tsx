import { useEffect, useRef } from 'react'
import { useKanbanStore, type DueFilter } from '../store/useKanbanStore'
import { AccountMenu } from './AccountMenu'
import { BoardSwitcher } from './BoardSwitcher'
import { BrandMark } from './BrandMark'
import { DarkModeToggle } from './DarkModeToggle'

const DUE_FILTER_LABEL: Record<DueFilter, string> = {
  all: 'Any due date',
  overdue: 'Overdue',
  week: 'Due this week',
  none: 'No due date',
}

export function TopBar() {
  const searchQuery = useKanbanStore((s) => s.searchQuery)
  const setSearchQuery = useKanbanStore((s) => s.setSearchQuery)
  const tagFilter = useKanbanStore((s) => s.tagFilter)
  const setTagFilter = useKanbanStore((s) => s.setTagFilter)
  const dueFilter = useKanbanStore((s) => s.dueFilter)
  const setDueFilter = useKanbanStore((s) => s.setDueFilter)
  const archivedCount = useKanbanStore((s) => s.cards.filter((c) => c.archived).length)
  const setArchivedPanelOpen = useKanbanStore((s) => s.setArchivedPanelOpen)
  const exportData = useKanbanStore((s) => s.exportData)
  const importData = useKanbanStore((s) => s.importData)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
      if (e.key === '/' && !isTyping) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-3">
        <div className="border-r border-border pr-3">
          <BrandMark />
        </div>
        <BoardSwitcher />
        <input
          ref={searchInputRef}
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tasks…  (press /)"
          aria-label="Search tasks"
          className="h-10 w-56 rounded-md border border-border bg-surface px-3 text-[13px] text-text-primary placeholder:text-text-secondary outline-none"
        />
        <select
          value={dueFilter}
          onChange={(e) => setDueFilter(e.target.value as DueFilter)}
          aria-label="Filter by due date"
          className="h-10 rounded-md border border-border bg-surface px-2 text-[13px] text-text-secondary outline-none"
        >
          {(Object.keys(DUE_FILTER_LABEL) as DueFilter[]).map((key) => (
            <option key={key} value={key}>
              {DUE_FILTER_LABEL[key]}
            </option>
          ))}
        </select>
        {tagFilter && (
          <button
            type="button"
            onClick={() => setTagFilter(null)}
            className="flex h-10 items-center gap-1 rounded-md bg-accent-tint px-2 text-[12px] text-text-secondary"
          >
            Tag: {tagFilter}
            <span aria-hidden="true">&times;</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setArchivedPanelOpen(true)}
          className="h-10 rounded-md px-3 text-[13px] tabular-nums text-text-secondary hover:bg-accent-tint"
        >
          Archived{archivedCount > 0 ? ` (${archivedCount})` : ''}
        </button>
        <button
          type="button"
          onClick={() => exportData()}
          className="h-10 rounded-md px-3 text-[13px] text-text-secondary hover:bg-accent-tint"
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="h-10 rounded-md px-3 text-[13px] text-text-secondary hover:bg-accent-tint"
        >
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) importData(file)
            e.target.value = ''
          }}
        />
        <AccountMenu />
        <DarkModeToggle />
      </div>
    </header>
  )
}
