import { useRef, useState } from 'react'
import type { ChangeEvent, SyntheticEvent } from 'react'
import { createPortal } from 'react-dom'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { matchesMentionQuery } from '@/lib/mentions'
import type { MentionCandidate } from '@/lib/mentions'

interface ActiveQuery {
  atIndex: number
  query: string
  // Captured from the event target at the moment the query changes (not
  // read from a ref during render) — feed cards use `overflow-hidden`
  // (rounded corners), which would otherwise clip an absolutely-positioned
  // dropdown anchored inside them, so the suggestion list is portaled to
  // <body> and placed using this instead.
  fieldRect: DOMRect
}

// Looks backward from the caret for the "@" starting the token being
// typed. A mention token may itself contain spaces (some display names do,
// e.g. "E2E Fixture 1"), so it isn't cut at the first space — only at a
// newline, another "@", or the start of the field. The char right before
// "@" must not be a letter/digit, so this doesn't fire mid-word or inside
// an email address.
function findActiveQuery(value: string, caret: number): { atIndex: number; query: string } | null {
  const uptoCaret = value.slice(0, caret)
  const atIndex = uptoCaret.lastIndexOf('@')
  if (atIndex === -1) return null
  const between = uptoCaret.slice(atIndex + 1)
  if (between.includes('\n') || between.includes('@')) return null
  const charBefore = uptoCaret[atIndex - 1]
  if (charBefore && /[\p{L}\p{N}]/u.test(charBefore)) return null
  return { atIndex, query: between }
}

interface MentionFieldProps {
  value: string
  onChange: (value: string) => void
  candidates: MentionCandidate[]
  placeholder?: string
  disabled?: boolean
  multiline?: boolean
  className?: string
}

type FieldElement = HTMLTextAreaElement | HTMLInputElement

export function MentionField({
  value,
  onChange,
  candidates,
  placeholder,
  disabled,
  multiline = false,
  className,
}: MentionFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeQuery, setActiveQuery] = useState<ActiveQuery | null>(null)

  function updateActiveQuery(target: FieldElement, textValue: string) {
    const found = findActiveQuery(textValue, target.selectionStart ?? textValue.length)
    setActiveQuery(found ? { ...found, fieldRect: target.getBoundingClientRect() } : null)
  }

  function handleChange(event: ChangeEvent<FieldElement>) {
    onChange(event.target.value)
    updateActiveQuery(event.target, event.target.value)
  }

  function handleSelect(event: SyntheticEvent<FieldElement>) {
    updateActiveQuery(event.currentTarget, value)
  }

  function handleBlur() {
    // Delayed so a click on a suggestion (see onMouseDown below) still
    // registers before the dropdown disappears.
    setTimeout(() => setActiveQuery(null), 100)
  }

  function selectSuggestion(candidate: MentionCandidate) {
    if (!activeQuery) return
    const el = multiline ? textareaRef.current : inputRef.current
    const caret = el?.selectionStart ?? value.length
    const newValue = `${value.slice(0, activeQuery.atIndex)}@${candidate.displayName} ${value.slice(caret)}`
    const newCaret = activeQuery.atIndex + candidate.displayName.length + 2
    onChange(newValue)
    setActiveQuery(null)
    requestAnimationFrame(() => {
      const target = multiline ? textareaRef.current : inputRef.current
      target?.focus()
      target?.setSelectionRange(newCaret, newCaret)
    })
  }

  const suggestions = activeQuery
    ? candidates.filter((c) => matchesMentionQuery(c.displayName, activeQuery.query)).slice(0, 5)
    : []
  const showDropdown = suggestions.length > 0

  return (
    <div className="relative">
      {multiline ? (
        <Textarea
          ref={textareaRef}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
          onChange={handleChange}
          onSelect={handleSelect}
          onBlur={handleBlur}
        />
      ) : (
        <Input
          ref={inputRef}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
          onChange={handleChange}
          onSelect={handleSelect}
          onBlur={handleBlur}
        />
      )}

      {showDropdown &&
        activeQuery &&
        createPortal(
          <ul
            className="fixed z-50 mt-1 max-w-64 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md"
            style={{
              top: activeQuery.fieldRect.bottom,
              left: activeQuery.fieldRect.left,
              width: activeQuery.fieldRect.width,
            }}
          >
            {suggestions.map((candidate) => (
              <li key={candidate.userId}>
                <button
                  type="button"
                  className="w-full px-2.5 py-1.5 text-left text-sm hover:bg-muted"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSuggestion(candidate)}
                >
                  @{candidate.displayName}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  )
}
