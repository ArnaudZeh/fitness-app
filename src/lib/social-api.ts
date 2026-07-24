import { supabase } from '@/lib/supabase'
import { fetchProgressPhotos, getSignedPhotoUrl } from '@/lib/progress-photos-api'
import { mergeFeedEntries } from '@/lib/social-display'
import type {
  FeedEntry,
  MilestoneFeedEntry,
  MilestoneWithImage,
  PhotoFeedEntry,
} from '@/lib/social-display'

// public_profiles only ever contains rows for users who opted in — a
// missing lookup (own entries, before this user opted in themselves) falls
// back to a generic label rather than showing nothing.
export async function fetchFeed(): Promise<FeedEntry[]> {
  const [{ data: milestones, error: milestonesError }, photos] = await Promise.all([
    supabase
      .from('milestones')
      .select('*, exercise:exercises(image_url)')
      .order('achieved_at', { ascending: false })
      .limit(50),
    fetchProgressPhotos(),
  ])
  if (milestonesError) throw milestonesError

  const userIds = [
    ...new Set([...milestones.map((m) => m.user_id), ...photos.map((p) => p.user_id)]),
  ]
  const { data: profiles, error: profilesError } = await supabase
    .from('public_profiles')
    .select('id, display_name')
    .in('id', userIds)
  if (profilesError) throw profilesError

  const displayNameByUserId = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name ?? 'Utilisateur']),
  )

  const milestoneEntries: MilestoneFeedEntry[] = milestones.map((milestone) => ({
    kind: 'milestone',
    id: milestone.id,
    userId: milestone.user_id,
    displayName: displayNameByUserId.get(milestone.user_id) ?? 'Utilisateur',
    occurredAt: milestone.achieved_at,
    milestone,
  }))

  const photoEntries: PhotoFeedEntry[] = await Promise.all(
    photos.map(async (photo) => ({
      kind: 'photo' as const,
      id: photo.id,
      userId: photo.user_id,
      displayName: displayNameByUserId.get(photo.user_id) ?? 'Utilisateur',
      occurredAt: `${photo.photo_date}T00:00:00Z`,
      photo,
      signedUrl: await getSignedPhotoUrl(photo.storage_path),
    })),
  )

  return mergeFeedEntries(milestoneEntries, photoEntries)
}

// Own milestones only (never another user's, even if opted into sharing) —
// this is for the dashboard's personal "latest record" glance, not the feed.
export async function fetchLatestMilestone(): Promise<MilestoneWithImage | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('milestones')
    .select('*, exercise:exercises(image_url)')
    .eq('user_id', user.id)
    .order('achieved_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function deleteMilestone(id: string): Promise<void> {
  const { error } = await supabase.from('milestones').delete().eq('id', id)
  if (error) throw error
}
