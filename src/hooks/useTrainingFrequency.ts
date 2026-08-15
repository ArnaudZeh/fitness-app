import { useQuery } from '@tanstack/react-query'
import { computeAverageWeeklyTrainingMinutes } from '@/lib/nutrition-calc'
import { fetchRecentCompletedSessions, TRAINING_WINDOW_DAYS } from '@/lib/training-frequency-api'

export function useAverageWeeklyTrainingMinutes() {
  return useQuery({
    queryKey: ['recent-completed-sessions'],
    queryFn: fetchRecentCompletedSessions,
    select: (sessions) => computeAverageWeeklyTrainingMinutes(sessions, TRAINING_WINDOW_DAYS),
  })
}
