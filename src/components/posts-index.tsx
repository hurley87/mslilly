'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import PostCard, { type PostCardData } from './post-card';
import PostDialog from './post-dialog';
import type { SearchResult } from '@/lib/semantic-search';

interface PostsResponse {
  results: PostCardData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  count: number;
}

type MediaType = 'all' | 'photos' | 'videos';
type SortOrder = 'newest' | 'oldest';

const SUGGESTED_TAGS = [
  'cheese',
  'napping',
  'barking',
  'garden',
  'treats',
  'walks',
  'biscuit dance',
  'The Warden',
  'throwback',
];

/**
 * Main posts index component with search, filtering, and infinite scroll
 */
export default function PostsIndex() {
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [mediaType, setMediaType] = useState<MediaType>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Dialog state
  const [selectedPost, setSelectedPost] = useState<PostCardData | null>(null);

  const observerTarget = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const hasLoadedInitialRef = useRef(false);

  /**
   * Loads posts from the API
   */
  const loadPosts = useCallback(
    async (page: number, reset: boolean = false) => {
      // Use ref to check loading state without causing re-renders
      if (isLoadingRef.current) {
        return;
      }

      isLoadingRef.current = true;

      if (reset) {
        setIsLoading(true);
        setPosts([]);
        setCurrentPage(1);
      } else {
        setIsLoadingMore(true);
      }

      setError(null);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
          type: mediaType,
          sort: sortOrder,
        });

        const response = await fetch(`/api/posts?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to load posts: ${response.statusText}`
          );
        }

        const data: PostsResponse = await response.json();
        
        if (reset) {
          setPosts(data.results);
        } else {
          setPosts((prev) => [...prev, ...data.results]);
        }

        setHasMore(data.pagination.hasNextPage);
        setCurrentPage(page);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred'
        );
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [mediaType, sortOrder]
  );

  /**
   * Performs search API call
   */
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&limit=50`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Search failed: ${response.statusText}`
        );
      }

      const data: SearchResponse = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred'
      );
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Debounced search effect
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  /**
   * Load initial posts
   */
  useEffect(() => {
    // Only load if not searching and haven't loaded initial data yet, or if filters changed
    if (!hasSearched && searchQuery.length < 2 && !isLoadingRef.current) {
      // Reset hasLoadedInitial when filters change
      if (hasLoadedInitialRef.current) {
        hasLoadedInitialRef.current = false;
      }
      
      if (!hasLoadedInitialRef.current) {
        hasLoadedInitialRef.current = true;
        loadPosts(1, true);
      }
    }
  }, [mediaType, sortOrder, loadPosts, hasSearched, searchQuery]); // Reload when filters change

  /**
   * Infinite scroll observer
   */
  useEffect(() => {
    // Only set up observer if we're browsing (not searching) and have more posts
    if (hasSearched || searchQuery.length >= 2 || !hasMore || isLoadingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadPosts(currentPage + 1, false);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoadingMore, currentPage, hasSearched, searchQuery, loadPosts]);

  /**
   * Convert SearchResult to PostCardData
   */
  const searchResultToPostCard = (result: SearchResult): PostCardData => ({
    postIndex: result.postIndex,
    mediaIndex: result.mediaIndex,
    title: result.title,
    uri: result.uri,
    isVideo: result.isVideo,
    creationTimestamp: result.creationTimestamp,
  });

  /**
   * Handle post card click - opens dialog with full post details
   */
  const handlePostClick = (post: PostCardData) => {
    setSelectedPost(post);
  };

  // Determine which posts to display
  const displayPosts =
    hasSearched && searchQuery.length >= 2
      ? searchResults.map(searchResultToPostCard)
      : posts;

  return (
    <div className="min-h-screen bg-[#FFFBEB]">
      {/* Compact Header */}
      <header className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl text-white font-[family-name:var(--font-pacifico)]">
                Ms. Lilly
              </h1>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4 max-w-md mx-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              className="w-full h-14 px-6 pr-12 text-lg rounded-full border-2 border-white/20 bg-white/95 backdrop-blur-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-white focus:bg-white transition-colors shadow-lg"
              aria-label="Search posts"
            />
            {(isSearching || isLoading) && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!isSearching && !isLoading && searchQuery.length >= 2 && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setHasSearched(false);
                  setSearchResults([]);
                }}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                aria-label="Clear search"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Search Tags */}
          <div className="flex flex-wrap gap-2 mb-4 justify-center">
            {SUGGESTED_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setSearchQuery(tag)}
                className="px-3 py-1.5 text-sm rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Filters - Only show when not searching */}
          {(!hasSearched || searchQuery.length < 2) && (
            <div className="flex flex-wrap items-center justify-center gap-4">
              {/* Media Type Filter */}
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-1 py-1">
                {(['all', 'photos', 'videos'] as MediaType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setMediaType(type);
                      setCurrentPage(1);
                      // Clear search when filters change
                      if (hasSearched) {
                        setSearchQuery('');
                        setHasSearched(false);
                        setSearchResults([]);
                      }
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      mediaType === type
                        ? 'bg-white text-[#F59E0B] shadow-md'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {type === 'all' ? 'All' : type === 'photos' ? '📷 Photos' : '🎥 Videos'}
                  </button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value as SortOrder);
                  setCurrentPage(1);
                  // Clear search when filters change
                  if (hasSearched) {
                    setSearchQuery('');
                    setHasSearched(false);
                    setSearchResults([]);
                  }
                }}
                className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/30 focus:outline-none focus:bg-white/30 transition-colors text-sm font-medium cursor-pointer"
              >
                <option value="newest" className="text-zinc-900">
                  Newest First
                </option>
                <option value="oldest" className="text-zinc-900">
                  Oldest First
                </option>
              </select>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && displayPosts.length === 0 && (
          <div className="flex justify-center items-center py-20">
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-[#F59E0B] rounded-full animate-bounce" />
              <div
                className="w-3 h-3 bg-[#F59E0B] rounded-full animate-bounce"
                style={{ animationDelay: '0.1s' }}
              />
              <div
                className="w-3 h-3 bg-[#F59E0B] rounded-full animate-bounce"
                style={{ animationDelay: '0.2s' }}
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && displayPosts.length === 0 && !error && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🐾</div>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-2">
              {hasSearched && searchQuery.length >= 2
                ? `No results found for "${searchQuery}"`
                : 'No posts found'}
            </p>
            {hasSearched && searchQuery.length >= 2 && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setHasSearched(false);
                  setSearchResults([]);
                }}
                className="text-[#F59E0B] hover:text-[#D97706] underline"
              >
                Clear search and browse all posts
              </button>
            )}
          </div>
        )}

        {/* Posts Grid */}
        {displayPosts.length > 0 && (
          <>
            {hasSearched && searchQuery.length >= 2 && (
              <div className="mb-6 text-sm text-zinc-600 dark:text-zinc-400 text-center">
                Found {searchResults.length} result
                {searchResults.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayPosts.map((post, index) => (
                <PostCard
                  key={`${post.postIndex}-${post.mediaIndex}-${index}`}
                  post={post}
                  onClick={handlePostClick}
                />
              ))}
            </div>

            {/* Infinite Scroll Trigger */}
            {!hasSearched && searchQuery.length < 2 && hasMore && (
              <div ref={observerTarget} className="h-20 flex items-center justify-center">
                {isLoadingMore && (
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-[#F59E0B] rounded-full animate-bounce" />
                    <div
                      className="w-3 h-3 bg-[#F59E0B] rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="w-3 h-3 bg-[#F59E0B] rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* End of Results */}
            {!hasMore && displayPosts.length > 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">🐾</div>
                <p className="text-zinc-600 dark:text-zinc-400">
                  You&apos;ve seen all my adventures!
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Post Detail Dialog */}
      <PostDialog
        post={selectedPost}
        open={selectedPost !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPost(null);
          }
        }}
      />
    </div>
  );
}
