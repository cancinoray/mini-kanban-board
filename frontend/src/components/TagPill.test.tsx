import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TagPill } from './TagPill'

describe('TagPill', () => {
  it('renders the label', () => {
    render(<TagPill label="urgent" />)
    expect(screen.getByText('urgent')).toBeInTheDocument()
  })

  it('does not render a remove button when onRemove is omitted', () => {
    render(<TagPill label="urgent" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onRemove when the remove button is clicked', async () => {
    const onRemove = vi.fn()
    const user = userEvent.setup()
    render(<TagPill label="urgent" onRemove={onRemove} />)

    await user.click(screen.getByRole('button', { name: 'Remove tag urgent' }))

    expect(onRemove).toHaveBeenCalledOnce()
  })
})
