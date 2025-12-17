import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

interface PostMedia {
  uri: string;
  creation_timestamp: number;
  title: string;
  media_metadata?: {
    photo_metadata?: unknown;
    video_metadata?: unknown;
  };
}

interface Post {
  media: PostMedia[];
}

interface PostResult {
  postIndex: number;
  mediaIndex: number;
  title: string;
  uri: string;
  isVideo: boolean;
  creationTimestamp: number;
  year: number;
}

let cachedPosts: Post[] | null = null;

/**
 * Loads posts from JSON file (cached after first load)
 */
function loadPosts(): Post[] {
  if (cachedPosts) {
    return cachedPosts;
  }

  try {
    const postsPath = join(process.cwd(), 'public', 'posts_1.json');
    const data: Post[] = JSON.parse(readFileSync(postsPath, 'utf-8'));
    cachedPosts = data;
    return cachedPosts;
  } catch (error) {
    throw new Error(
      `Failed to load posts: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if URI is a valid image file
 */
function isValidImageUri(uri: string): boolean {
  if (!uri) return false;
  const lowerUri = uri.toLowerCase();
  return (
    lowerUri.endsWith('.jpg') ||
    lowerUri.endsWith('.jpeg') ||
    lowerUri.endsWith('.png') ||
    lowerUri.endsWith('.gif') ||
    lowerUri.endsWith('.webp')
  );
}

/**
 * Check if URI is a valid video file
 */
function isValidVideoUri(uri: string): boolean {
  if (!uri) return false;
  const lowerUri = uri.toLowerCase();
  return (
    lowerUri.endsWith('.mp4') ||
    lowerUri.endsWith('.mov') ||
    lowerUri.endsWith('.webm') ||
    lowerUri.endsWith('.avi')
  );
}

/**
 * Flattens posts into individual media items with indices
 * Only includes posts with valid image or video URIs
 */
function flattenPosts(posts: Post[]): PostResult[] {
  const results: PostResult[] = [];

  posts.forEach((post, postIndex) => {
    if (post.media && Array.isArray(post.media)) {
      post.media.forEach((media, mediaIndex) => {
        if (media.uri && media.title) {
          // Only include posts with valid image or video URIs
          const isVideo = !!media.media_metadata?.video_metadata;
          const hasValidMedia =
            isValidImageUri(media.uri) || isValidVideoUri(media.uri);

          if (hasValidMedia) {
            const timestamp = media.creation_timestamp || 0;
            const date = new Date(timestamp * 1000);

            results.push({
              postIndex,
              mediaIndex,
              title: media.title,
              uri: media.uri,
              isVideo: isVideo || isValidVideoUri(media.uri),
              creationTimestamp: timestamp,
              year: date.getFullYear(),
            });
          }
        }
      });
    }
  });

  return results;
}

/**
 * GET /api/posts/on-this-day
 *
 * Returns posts from the same month and day across all years
 */
export async function GET() {
  try {
    const posts = loadPosts();
    const results = flattenPosts(posts);

    // Get current month and day
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const currentDay = now.getDate(); // 1-31

    // Filter posts that match the month and day
    const onThisDayPosts = results.filter((post) => {
      const postDate = new Date(post.creationTimestamp * 1000);
      return (
        postDate.getMonth() === currentMonth &&
        postDate.getDate() === currentDay
      );
    });

    // Sort by year (newest first)
    onThisDayPosts.sort((a, b) => b.year - a.year);

    return NextResponse.json({
      results: onThisDayPosts,
      count: onThisDayPosts.length,
      date: {
        month: currentMonth + 1, // 1-12 for display
        day: currentDay,
      },
    });
  } catch (error) {
    console.error('On This Day API error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
