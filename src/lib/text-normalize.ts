// Strips accents and lowercases, so a search for "cacahuete" matches
// "cacahuète" — shared by every local (non-network) food/dish search list.
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
