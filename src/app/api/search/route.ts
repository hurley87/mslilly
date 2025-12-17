import { NextRequest, NextResponse } from 'next/server';
import { searchPosts } from '@/lib/semantic-search';
import { hybridSearch, keywordSearch } from '@/lib/hybrid-search';

type SearchMode = 'semantic' | 'keyword' | 'hybrid';

/**
 * GET /api/search?q=query&limit=10&mode=hybrid
 * 
 * Performs search on post titles using the specified mode
 * 
 * Query parameters:
 * - q: Search query (required)
 * - limit: Number of results to return (default: 10, max: 50)
 * - mode: Search mode - 'semantic' | 'keyword' | 'hybrid' (default: 'hybrid')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limitParam = searchParams.get('limit');
    const modeParam = searchParams.get('mode');

    // Validate query
    if (!query || query.trim() === '') {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    // Parse and validate limit
    let limit = 10;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return NextResponse.json(
          { error: 'Limit must be a positive number' },
          { status: 400 }
        );
      }
      limit = Math.min(parsedLimit, 50); // Cap at 50
    }

    // Parse and validate mode
    const validModes: SearchMode[] = ['semantic', 'keyword', 'hybrid'];
    const mode: SearchMode =
      (modeParam?.toLowerCase() as SearchMode) || 'hybrid';
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        {
          error: `Invalid mode. Must be one of: ${validModes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Perform search based on mode
    let results;
    switch (mode) {
      case 'semantic':
        results = await searchPosts(query, limit);
        break;
      case 'keyword':
        results = await keywordSearch(query, limit);
        break;
      case 'hybrid':
        results = await hybridSearch(query, limit);
        break;
    }

    return NextResponse.json({
      query,
      mode,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('Search error:', error);
    
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

