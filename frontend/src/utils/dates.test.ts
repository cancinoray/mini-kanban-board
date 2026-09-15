import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatDueDate, isDueThisWeek, isOverdue } from './dates'

describe('isOverdue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-15T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false for null', () => {
    expect(isOverdue(null)).toBe(false)
  })

  it('returns false for today', () => {
    expect(isOverdue('2026-09-15')).toBe(false)
  })

  it('returns false for a future date', () => {
    expect(isOverdue('2026-09-16')).toBe(false)
  })

  it('returns true for a past date', () => {
    expect(isOverdue('2026-09-14')).toBe(true)
  })
})

describe('isDueThisWeek', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-15T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false for null', () => {
    expect(isDueThisWeek(null)).toBe(false)
  })

  it('returns true for today', () => {
    expect(isDueThisWeek('2026-09-15')).toBe(true)
  })

  it('returns true for a date within the next 7 days', () => {
    expect(isDueThisWeek('2026-09-20')).toBe(true)
  })

  it('returns false for a date more than 7 days out', () => {
    expect(isDueThisWeek('2026-09-25')).toBe(false)
  })

  it('returns false for a past date', () => {
    expect(isDueThisWeek('2026-09-10')).toBe(false)
  })
})

describe('formatDueDate', () => {
  it('returns an empty string for null', () => {
    expect(formatDueDate(null)).toBe('')
  })

  it('formats a date as month and day', () => {
    expect(formatDueDate('2026-09-20')).toMatch(/Sep (19|20)/)
  })
})
