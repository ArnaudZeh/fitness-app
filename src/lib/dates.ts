// Local calendar date (YYYY-MM-DD) for an ISO instant, in the viewer's own
// timezone — as opposed to the UTC date baked into the instant's string
// representation. A session started in the evening west of UTC (e.g.
// Tahiti, UTC-10) would otherwise land on "tomorrow" by UTC while still
// being "today" for the person who ran it.
export function toLocalDateString(instant: string): string {
  const date = new Date(instant)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
