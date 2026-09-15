export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due.getTime() < today.getTime()
}

export function isDueThisWeek(dueDate: string | null): boolean {
  if (!dueDate) return false
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekFromNow = new Date(today)
  weekFromNow.setDate(weekFromNow.getDate() + 7)
  return due.getTime() >= today.getTime() && due.getTime() <= weekFromNow.getTime()
}

export function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return ''
  const due = new Date(dueDate)
  return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
