import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Get the public URL for a media file stored in Supabase Storage
 * @param path - The path to the media file (e.g., 'media/posts/202107/image.jpg')
 * @returns The full public URL to the media file
 */
export function getMediaUrl(path: string): string {
  // Remove leading slash if present
  let cleanPath = path.startsWith('/') ? path.slice(1) : path
  // Remove 'media/' prefix if present since it's already in the bucket URL
  if (cleanPath.startsWith('media/')) {
    cleanPath = cleanPath.slice(6) // Remove 'media/'
  }
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${cleanPath}`
}
