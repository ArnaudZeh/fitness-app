import { supabase } from '@/lib/supabase'
import { compressImage } from '@/lib/image-compression'

const BUCKET = 'avatars'
const SIGNED_URL_EXPIRY_SECONDS = 3600
// Rendered at most at `lg` size (5rem/80px) — well under this keeps the
// upload tiny without visible quality loss.
const AVATAR_MAX_DIMENSION = 512

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// Fixed path per user (not a UUID per upload like posts) — a new upload
// overwrites the previous avatar via `upsert`, so there's no old file left
// behind to separately clean up.
function avatarPath(userId: string): string {
  return `${userId}/avatar.jpg`
}

export async function uploadAvatar(file: File): Promise<string> {
  const userId = await requireUserId()
  const compressed = await compressImage(file, AVATAR_MAX_DIMENSION)
  const path = avatarPath(userId)
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
  if (uploadError) throw uploadError

  const { error } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId)
  if (error) throw error
  return path
}

export async function removeAvatar(): Promise<void> {
  const userId = await requireUserId()
  const { error } = await supabase.from('profiles').update({ avatar_path: null }).eq('id', userId)
  if (error) throw error
  // Best-effort — the profile no longer references the file either way.
  await supabase.storage.from(BUCKET).remove([avatarPath(userId)])
}

export async function getSignedAvatarUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS)
  if (error) throw error
  return data.signedUrl
}
