import { useQuery } from '@tanstack/react-query'
import { fetchAverageSessionsPerWeek } from '@/lib/training-frequency-api'

export function useAverageSessionsPerWeek() {
  return useQuery({
    queryKey: ['average-sessions-per-week'],
    queryFn: fetchAverageSessionsPerWeek,
  })
}
