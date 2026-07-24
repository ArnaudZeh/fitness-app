import { supabase } from '@/lib/supabase'
import { compressImage } from '@/lib/image-compression'
import type { Post } from '@/lib/social-display'

const BUCKET = 'progress-photos'
const SIGNED_URL_EXPIRY_SECONDS = 3600

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export interface CreatePostInput {
  content: string | null
  file: File | null
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  const userId = await requireUserId()
  let path: string | null = null

  if (input.file) {
    const compressed = await compressImage(input.file)
    path = `${userId}/${crypto.randomUUID()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, compressed, { contentType: 'image/jpeg' })
    if (uploadError) throw uploadError
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({ user_id: userId, content: input.content, storage_path: path })
    .select()
    .single()
  if (error) {
    // Don't leave an orphaned object with no corresponding row if the
    // insert fails (e.g. a constraint violation).
    if (path) await supabase.storage.from(BUCKET).remove([path])
    throw error
  }
  return data
}

export async function deletePost(post: Pick<Post, 'id' | 'storage_path'>): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', post.id)
  if (error) throw error
  if (post.storage_path) {
    // Best-effort — the feed entry is already gone (the part the user
    // sees) even if this fails and leaves an orphaned file in storage.
    await supabase.storage.from(BUCKET).remove([post.storage_path])
  }
}

export async function getSignedPhotoUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS)
  if (error) throw error
  return data.signedUrl
}
