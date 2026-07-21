export interface Ordered {
  id: string
  order_index: number
}

// Pure so it can be unit-tested without a live Supabase call — boundary
// conditions (first/last/only item) are easy to get wrong here.
export function getSwapPair<T extends Ordered>(
  items: T[],
  id: string,
  direction: 'up' | 'down',
): [T, T] | null {
  const index = items.findIndex((item) => item.id === id)
  if (index === -1) return null
  const neighborIndex = direction === 'up' ? index - 1 : index + 1
  const neighbor = items[neighborIndex]
  const item = items[index]
  if (!neighbor || !item) return null
  return [item, neighbor]
}

export function nextOrderIndex(items: Ordered[]): number {
  return items.length === 0 ? 0 : Math.max(...items.map((item) => item.order_index)) + 1
}
