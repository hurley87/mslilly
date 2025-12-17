'use client';

import { useState, useEffect } from 'react';
import { type PostCardData } from './post-card';
import { getMediaUrl } from '@/lib/supabase';
import Image from 'next/image';

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

interface OnThisDayPost extends PostCardData {
  year: number;
}

interface OnThisDayResponse {
  results: OnThisDayPost[];
  count: number;
  date: {
    month: number;
    day: number;
  };
}

interface OnThisDayProps {
  onPostClick: (post: PostCardData) => void;
}

/**
 * "On This Day" component - shows posts from the same date in previous years
 */
export default function OnThisDay({ onPostClick }: OnThisDayProps) {
  const [posts, setPosts] = useState<OnThisDayPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [dateInfo, setDateInfo] = useState<{ month: number; day: number } | null>(null);

  useEffect(() => {
    const fetchOnThisDay = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/posts/on-this-day');

        if (!response.ok) {
          throw new Error('Failed to load On This Day posts');
        }

        const data: OnThisDayResponse = await response.json();
        // Filter out posts without valid media
        const validPosts = (data.results || []).filter(
          (post) =>
            post.uri &&
            (isValidImageUri(post.uri) || isValidVideoUri(post.uri))
        );
        setPosts(validPosts);
        setDateInfo(data.date);
      } catch (error) {
        console.error('Failed to load On This Day posts:', error);
        setPosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOnThisDay();
  }, []);

  // Don't render if no posts
  if (isLoading || posts.length === 0) {
    return null;
  }

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const monthName = dateInfo
    ? monthNames[dateInfo.month - 1]
    : new Date().toLocaleDateString('en-US', { month: 'long' });
  const day = dateInfo?.day || new Date().getDate();

  return (
    <div className="mb-8 rounded-xl border-2 border-[#F59E0B] bg-white shadow-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#FEF3C7] transition-colors"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} On This Day section`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📅</span>
          <div className="text-left">
            <h2 className="text-lg font-bold text-[#78350F]">
              On This Day: {monthName} {day}
            </h2>
            <p className="text-sm text-[#92400E]">
              {posts.length} {posts.length === 1 ? 'memory' : 'memories'} from this date
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-[#92400E] transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-6 py-4 bg-[#FFFBEB]">
          <div className="overflow-x-auto pb-4 -mx-2">
            <div className="flex gap-4 px-2">
              {posts.map((post, index) => (
                <div
                  key={`${post.postIndex}-${post.mediaIndex}-${index}`}
                  className="flex-shrink-0 w-48 cursor-pointer group"
                  onClick={() => onPostClick(post)}
                >
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden border-2 border-[#F59E0B] bg-white group-hover:shadow-lg transition-all">
                    {post.isVideo || isValidVideoUri(post.uri) ? (
                      <div className="relative w-full h-full bg-[#FEF3C7] flex items-center justify-center">
                        <span className="text-4xl">🎥</span>
                        <div className="absolute top-2 right-2 bg-[#F59E0B] text-white px-2 py-1 rounded-full text-xs font-bold">
                          Video
                        </div>
                      </div>
                    ) : isValidImageUri(post.uri) ? (
                      <Image
                        src={getMediaUrl(post.uri)}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        sizes="192px"
                        onError={(e) => {
                          // Hide image if it fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.fallback-emoji')) {
                            const fallback = document.createElement('div');
                            fallback.className =
                              'fallback-emoji absolute inset-0 flex items-center justify-center text-4xl bg-[#FEF3C7]';
                            fallback.textContent = '🐕';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div className="relative w-full h-full bg-[#FEF3C7] flex items-center justify-center">
                        <span className="text-4xl">🐕</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <div className="text-white text-xs font-medium">
                        {post.year}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-[#92400E] mt-2 line-clamp-2">
                    {post.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
