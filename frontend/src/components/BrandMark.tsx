/** The Punchlist mark: a punch hole in a ring. Used in every top-level header. */
export function BrandMark() {
  return (
    <div className="flex items-center gap-1.5 text-text-secondary">
      <svg width="12" height="12" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="5.5" fill="currentColor" />
      </svg>
      <span className="text-[13px]">Punchlist</span>
    </div>
  )
}
