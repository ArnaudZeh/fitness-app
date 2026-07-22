import { useQuery } from '@tanstack/react-query'
import { fetchSetHistory } from '@/lib/analytics-api'

export function useSetHistory() {
  return useQuery({ queryKey: ['set-history'], queryFn: fetchSetHistory })
}
