import { NextRequest, NextResponse } from 'next/server';
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
 * Flattens posts into individual media items with indices
 */
function flattenPosts(posts: Post[]): PostResult[] {
  const results: PostResult[] = [];

  posts.forEach((post, postIndex) => {
    if (post.media && Array.isArray(post.media)) {
      post.media.forEach((media, mediaIndex) => {
        if (media.uri && media.title) {
          const isVideo = !!media.media_metadata?.video_metadata;
          results.push({
            postIndex,
            mediaIndex,
            title: media.title,
            uri: media.uri,
            isVideo,
            creationTimestamp: media.creation_timestamp || 0,
          });
        }
      });
    }
  });

  return results;
}

type MediaType = 'all' | 'photos' | 'videos';
type SortOrder = 'newest' | 'oldest';

/**
 * GET /api/posts?page=1&limit=20&type=all&sort=newest
 *
 * Returns paginated posts with filtering and sorting
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Number of results per page (default: 20, max: 100)
 * - type: Filter by media type - 'all' | 'photos' | 'videos' (default: 'all')
 * - sort: Sort order - 'newest' | 'oldest' (default: 'newest')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const typeParam = searchParams.get('type');
    const sortParam = searchParams.get('sort');
    const randomParam = searchParams.get('random');

    // Parse and validate page
    let page = 1;
    if (pageParam) {
      const parsedPage = parseInt(pageParam, 10);
      if (!isNaN(parsedPage) && parsedPage >= 1) {
        page = parsedPage;
      }
    }

    // Parse and validate limit
    let limit = 20;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit >= 1) {
        limit = Math.min(parsedLimit, 100); // Cap at 100
      }
    }

    // Parse and validate type
    const validTypes: MediaType[] = ['all', 'photos', 'videos'];
    const type: MediaType =
      (typeParam?.toLowerCase() as MediaType) || 'all';
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        {
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Parse and validate sort
    const validSorts: SortOrder[] = ['newest', 'oldest'];
    const sort: SortOrder =
      (sortParam?.toLowerCase() as SortOrder) || 'newest';
    if (!validSorts.includes(sort)) {
      return NextResponse.json(
        {
          error: `Invalid sort. Must be one of: ${validSorts.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Load and flatten posts
    const posts = loadPosts();
    let results = flattenPosts(posts);

    // Filter by media type
    if (type === 'photos') {
      results = results.filter((r) => !r.isVideo);
    } else if (type === 'videos') {
      results = results.filter((r) => r.isVideo);
    }

    // Handle random post request
    if (randomParam === 'true') {
      if (results.length === 0) {
        return NextResponse.json(
          { error: 'No posts available' },
          { status: 404 }
        );
      }
      const randomIndex = Math.floor(Math.random() * results.length);
      return NextResponse.json({ result: results[randomIndex] });
    }

    // Sort by creation timestamp
    results.sort((a, b) => {
      if (sort === 'newest') {
        return b.creationTimestamp - a.creationTimestamp;
      } else {
        return a.creationTimestamp - b.creationTimestamp;
      }
    });

    // Calculate pagination
    const total = results.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedResults = results.slice(offset, offset + limit);

    return NextResponse.json({
      results: paginatedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Posts API error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
