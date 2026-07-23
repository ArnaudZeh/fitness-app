import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type Milestone = Database['public']['Tables']['milestones']['Row']

export interface FeedItem extends Milestone {
  displayName: string
}

export const MILESTONE_TYPE_LABELS: Record<Milestone['milestone_type'], string> = {
  one_rep_max: 'Nouveau record — 1RM estimé',
  weekly_tonnage: 'Nouveau record — tonnage hebdo',
  regularity_streak: 'Nouveau record — régularité',
}

// public_profiles only ever contains rows for users who opted in — a
// missing lookup (own milestones, before this user opted in themselves)
// falls back to a generic label rather than showing nothing.
export async function fetchFeed(): Promise<FeedItem[]> {
  const { data: milestones, error } = await supabase
    .from('milestones')
    .select('*')
    .order('achieved_at', { ascending: false })
    .limit(50)
  if (error) throw error

  const userIds = [...new Set(milestones.map((m) => m.user_id))]
  const { data: profiles, error: profilesError } = await supabase
    .from('public_profiles')
    .select('id, display_name')
    .in('id', userIds)
  if (profilesError) throw profilesError

  const displayNameByUserId = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name ?? 'Utilisateur']),
  )

  return milestones.map((milestone) => ({
    ...milestone,
    displayName: displayNameByUserId.get(milestone.user_id) ?? 'Utilisateur',
  }))
}

export async function deleteMilestone(id: string): Promise<void> {
  const { error } = await supabase.from('milestones').delete().eq('id', id)
  if (error) throw error
}
