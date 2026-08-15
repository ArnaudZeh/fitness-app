import { useQuery } from '@tanstack/react-query'
import { searchUsdaFdc } from '@/lib/usda-fdc-api'

const MIN_QUERY_LENGTH = 2

export function useUsdaFdcSearch(query: string) {
  const trimmed = query.trim()
  return useQuery({
    queryKey: ['usda-fdc-search', trimmed],
    queryFn: () => searchUsdaFdc(trimmed),
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
  })
}
