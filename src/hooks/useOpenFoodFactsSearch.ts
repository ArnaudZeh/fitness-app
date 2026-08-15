import { useQuery } from '@tanstack/react-query'
import { searchOpenFoodFacts } from '@/lib/openfoodfacts-api'

const MIN_QUERY_LENGTH = 2

export function useOpenFoodFactsSearch(query: string) {
  const trimmed = query.trim()
  return useQuery({
    queryKey: ['openfoodfacts-search', trimmed],
    queryFn: () => searchOpenFoodFacts(trimmed),
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
  })
}
