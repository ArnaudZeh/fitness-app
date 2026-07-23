import { supabase } from '@/lib/supabase'
import { compressImage } from '@/lib/image-compression'
import type { ProgressPhoto } from '@/lib/social-display'

const BUCKET = 'progress-photos'
const SIGNED_URL_EXPIRY_SECONDS = 3600

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export interface UploadProgressPhotoInput {
  caption: string | null
  photoDate: string
}

export async function uploadProgressPhoto(
  file: File,
  input: UploadProgressPhotoInput,
): Promise<ProgressPhoto> {
  const userId = await requireUserId()
  const compressed = await compressImage(file)
  const path = `${userId}/${crypto.randomUUID()}.jpg`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { contentType: 'image/jpeg' })
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('progress_photos')
    .insert({
      user_id: userId,
      storage_path: path,
      caption: input.caption,
      photo_date: input.photoDate,
    })
    .select()
    .single()
  if (error) {
    // Don't leave an orphaned object with no corresponding row if the
    // insert fails (e.g. a constraint violation).
    await supabase.storage.from(BUCKET).remove([path])
    throw error
  }
  return data
}

export async function fetchProgressPhotos(): Promise<ProgressPhoto[]> {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('*')
    .order('photo_date', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

export async function deleteProgressPhoto(
  photo: Pick<ProgressPhoto, 'id' | 'storage_path'>,
): Promise<void> {
  const { error } = await supabase.from('progress_photos').delete().eq('id', photo.id)
  if (error) throw error
  // Best-effort — the feed entry is already gone (the part the user sees)
  // even if this fails and leaves an orphaned file in storage.
  await supabase.storage.from(BUCKET).remove([photo.storage_path])
}

export async function getSignedPhotoUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS)
  if (error) throw error
  return data.signedUrl
}
