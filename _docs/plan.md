# Mini Kanban — Project Spec

## 1. Product Scope

- **User:** Personal use, single user, no login
- **Platform:** Web app (browser)
- **Data:** Local storage only, with JSON export/import for backup
- **Boards:** Multiple boards, switchable (e.g. Work, Personal, Projects)
- **Columns:** Fully customizable — add, rename, delete per board
- **Cards:** Title, description, due date, tags/labels
- **Core interaction:** Drag-and-drop cards between columns
- **Extras in scope:**
  - Search/filter cards by tag or due date
  - Dark mode
  - Confirmation prompt before archiving/deleting

---

## 2. Frontend Design Spec

### Design Brief Summary

A personal, single-user kanban web app. Quiet, minimal, functional — a tool you open many times a day, not a marketing page. The interface should get out of the way and let the content (your tasks) carry the visual weight.

### Color

**Light mode**

| Token            | Hex       | Use                                     |
| ---------------- | --------- | --------------------------------------- |
| `bg`             | `#F7F8FA` | App background                          |
| `surface`        | `#FFFFFF` | Cards, panels                           |
| `border`         | `#E2E5EA` | Hairlines, card outlines                |
| `text-primary`   | `#1C2128` | Titles, body text                       |
| `text-secondary` | `#5B6472` | Metadata, timestamps, labels            |
| `accent`         | `#45566E` | Active states, links, primary buttons   |
| `accent-tint`    | `#EEF1F5` | Tag backgrounds, selected column        |
| `warning`        | `#9C6B4F` | Overdue due dates (muted clay, not red) |

**Dark mode**

| Token            | Hex       | Use                  |
| ---------------- | --------- | -------------------- |
| `bg`             | `#14171C` | App background       |
| `surface`        | `#1B1F26` | Cards, panels        |
| `border`         | `#2A2F38` | Hairlines            |
| `text-primary`   | `#E7E9EC` | Titles, body text    |
| `text-secondary` | `#9AA3B0` | Metadata             |
| `accent`         | `#8CA0BE` | Active states, links |
| `accent-tint`    | `#232A34` | Tag backgrounds      |

No gradients, no drop-shadow-on-everything. Shadows are reserved for one moment: a card lifting while dragged.

### Type

One family, used consistently: a plain, legible grotesk (e.g. **Inter** or **IBM Plex Sans**). Personality comes from spacing and restraint, not from a second typeface.

| Role                           | Size | Weight                    |
| ------------------------------ | ---- | ------------------------- |
| Board name (header)            | 18px | Medium (500)              |
| Column title                   | 14px | Medium (500), no all-caps |
| Card title                     | 14px | Regular (400)             |
| Card metadata (due date, tags) | 12px | Regular, `text-secondary` |
| Body/description text          | 13px | Regular, line-height 1.5  |

Sentence case everywhere. No tracked-out uppercase labels, no eyebrow text above headers.

### Layout

**Top bar** — flush left: board switcher (dropdown, current board name + caret), then a search/filter field. Flush right: dark-mode toggle. No hamburger, no permanent sidebar.

**Board view** — columns left to right, horizontal scroll if they overflow. Generous gutter between columns (28–32px) so whitespace does the separating, not borders.

```
┌───────────────────────────────────────────────────────┐
│ Work ▾              [search tasks…]            ☾       │
├───────────────────────────────────────────────────────┤
│                                                         │
│  To Do            Doing            Done      + Column  │
│  ──────           ──────           ──────              │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐       │
│  │ Card title │    │ Card title │    │ Card title │     │
│  │ tag  tag   │    │ due Sep 20 │    │            │     │
│  └───────────┘    └───────────┘    └───────────┘       │
│  ┌───────────┐                                          │
│  │ Card title │                                          │
│  └───────────┘                                          │
│  + Add card                                              │
│                                                         │
└───────────────────────────────────────────────────────┘
```

Columns flush at the top, left-aligned. Column header sits above a thin hairline rule, not a filled block.

**Card** — flat surface, 1px `border`, 6px corner radius. Padding 12px. On drag: border disappears, soft shadow appears, slight scale (1.02).

**Card detail (on click)** — opens as a side panel sliding in from the right (not a full-screen dimming modal): title, description, due date, tags, delete/archive action at the bottom.

### Interaction & Motion

- One drag interaction: card lift + shadow while dragging, drop with a quick settle (150ms ease-out). No entrance animations, no hover-transition on every card.
- Column reorder: same restrained lift-and-settle.
- No animation on page load.
- Respect `prefers-reduced-motion`.

### Tags & States

- Tags are small outlined pills using `accent-tint` background and `text-secondary` text.
- Overdue due dates shift to `warning` color — no red, no flashing icon.
- Empty column: quiet inline text, e.g. "No cards yet" with a "+ Add card" affordance below.
- Empty board (first run): one centered line — "Create your first board to get started" — plus the action.

### Accessibility Floor

- Visible keyboard focus ring (`accent`, 2px offset) on every interactive element.
- Drag-and-drop has a keyboard-operable fallback.
- Color contrast: text-primary on bg/surface meets AA in both modes.
- Touch targets ≥ 40px on mobile widths.

### Principles Recap

1. Whitespace and typographic weight carry hierarchy — not borders, shadows, or color.
2. One accent, used sparingly — not decoration.
3. One typeface, one deliberate scale.
4. Motion only responds to direct action (drag, drop) — nothing animates on its own.
5. Empty and error states speak plainly, in the interface's voice, paired with the next action.
