import { describe, expect, it } from 'vitest'
import { parseLocaleNumber } from '@/lib/number-input'

describe('parseLocaleNumber', () => {
  it('parses a period-decimal string', () => {
    expect(parseLocaleNumber('1.1')).toBe(1.1)
  })

  it('parses a comma-decimal string (French keyboard input)', () => {
    expect(parseLocaleNumber('1,1')).toBe(1.1)
  })

  it('parses a plain integer', () => {
    expect(parseLocaleNumber('150')).toBe(150)
  })

  it('trims surrounding whitespace', () => {
    expect(parseLocaleNumber('  21  ')).toBe(21)
  })

  it('returns NaN for non-numeric input', () => {
    expect(Number.isNaN(parseLocaleNumber('abc'))).toBe(true)
  })

  it('coerces an empty string to 0, matching plain Number() behavior', () => {
    // Callers that need to treat "not filled in" differently from 0 must
    // check for an empty/blank string themselves before calling this.
    expect(parseLocaleNumber('')).toBe(0)
  })
})
