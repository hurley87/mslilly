'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import type { SearchResult } from '@/lib/semantic-search';
import { getMediaUrl } from '@/lib/supabase';

interface SearchResponse {
  query: string;
  results: SearchResult[];
  count: number;
}

/**
 * Search component with debounced input and results display
 */
export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  /**
   * Performs search API call
   */
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&limit=20`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Search failed: ${response.statusText}`
        );
      }

      const data: SearchResponse = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred'
      );
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Debounced search effect
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  /**
   * Formats Unix timestamp (seconds) to a readable date string
   */
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  /**
   * Video player component with click-to-play functionality
   */
  function VideoPlayer({ result }: { result: SearchResult }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaUrl = getMediaUrl(result.uri);

    // Check if video file exists before rendering
    useEffect(() => {
      const checkVideoExists = async () => {
        try {
          const response = await fetch(mediaUrl, { method: 'HEAD' });
          if (!response.ok) {
            setHasError(true);
            setErrorMessage(`File not found (${response.status})`);
          }
        } catch {
          setHasError(true);
          setErrorMessage('Failed to load video');
        }
      };
      checkVideoExists();
    }, [mediaUrl]);

    const handleClick = () => {
      if (!videoRef.current || hasError) return;

      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch((err) => {
          setHasError(true);
          setErrorMessage(err.message);
          setIsPlaying(false);
        });
        setIsPlaying(true);
      }
    };

    const handleVideoEnded = () => {
      setIsPlaying(false);
    };

    const handleVideoLoadedMetadata = () => {
      setHasError(false);
    };

    const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      const video = e.currentTarget;
      setHasError(true);
      if (video.error) {
        const errorMessages: { [key: number]: string } = {
          1: 'Video loading aborted',
          2: 'Network error',
          3: 'Video decoding failed',
          4: 'Video format not supported',
        };
        setErrorMessage(errorMessages[video.error.code] || `Error ${video.error.code}`);
      } else {
        setErrorMessage('Video failed to load');
      }
      setIsPlaying(false);
    };

    return (
      <div className="relative w-full h-full cursor-pointer group" onClick={handleClick}>
        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 p-4">
            <svg
              className="w-12 h-12 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs text-center">{errorMessage || 'Video unavailable'}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              src={mediaUrl}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
              onEnded={handleVideoEnded}
              onLoadedMetadata={handleVideoLoadedMetadata}
              onError={handleVideoError}
            />
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                <div className="w-16 h-16 rounded-full bg-black/70 dark:bg-white/70 backdrop-blur-sm flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white dark:text-black ml-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Search Input */}
      <div className="mb-8">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts..."
            className="w-full h-14 px-6 pr-12 text-lg rounded-full border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
            aria-label="Search posts"
          />
          {isLoading && (
            <div className="absolute right-6 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-50 rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Results */}
      {hasSearched && !isLoading && !error && (
        <>
          {results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-500 dark:text-zinc-400">
                No results found for &quot;{query}&quot;
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((result, index) => (
                  <div
                    key={`${result.postIndex}-${result.mediaIndex}-${index}`}
                    className="group relative overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    {/* Media Thumbnail */}
                    <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      {result.isVideo ? (
                        <VideoPlayer result={result} />
                      ) : (
                        <Image
                          src={getMediaUrl(result.uri)}
                          alt={result.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      )}
                    </div>

                    {/* Title and Date */}
                    <div className="p-4">
                      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50 line-clamp-2 mb-1">
                        {result.title}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatDate(result.creationTimestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Empty State */}
      {!hasSearched && !isLoading && !error && (
        <div className="text-center py-12">
          <p className="text-zinc-500 dark:text-zinc-400">
            Enter at least 2 characters to search
          </p>
        </div>
      )}
    </div>
  );
}

