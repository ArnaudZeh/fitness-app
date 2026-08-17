// type="number" inputs are locale-sensitive: on a French device the
// numeric keyboard offers "," as the decimal separator, but the DOM's
// number-input value getter only ever recognizes "." per spec — typing
// "1,1" silently leaves the input in an invalid/empty state on several
// browsers (most reliably reproduced on iOS Safari). Every decimal-capable
// field in the nutrition forms uses type="text" inputMode="decimal"
// instead (same numeric keypad on mobile) and parses through this
// function, which accepts either separator.
export function parseLocaleNumber(value: string): number {
  return Number(value.trim().replace(',', '.'))
}
