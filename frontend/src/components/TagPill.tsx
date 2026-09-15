interface TagPillProps {
  label: string
  onRemove?: () => void
}

export function TagPill({ label, onRemove }: TagPillProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-accent-tint px-2 py-0.5 text-[12px] text-text-secondary">
      {label}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove tag ${label}`}
          onClick={onRemove}
          className="text-text-secondary hover:text-text-primary"
        >
          &times;
        </button>
      )}
    </span>
  )
}
