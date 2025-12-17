'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { getMediaUrl } from '@/lib/supabase';

export interface PostCardData {
  postIndex: number;
  mediaIndex: number;
  title: string;
  uri: string;
  isVideo: boolean;
  creationTimestamp: number;
}

interface PostCardProps {
  post: PostCardData;
  onClick?: (post: PostCardData) => void;
}

/**
 * Formats Unix timestamp (seconds) to a readable date string
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Video player component with click-to-play functionality
 */
function VideoPlayer({ uri }: { uri: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaUrl = getMediaUrl(uri);

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

/**
 * Reusable post card component for displaying posts in grids
 * Supports both images and videos with hover effects
 */
export default function PostCard({ post, onClick }: PostCardProps) {
  const mediaUrl = getMediaUrl(post.uri);

  return (
    <div
      onClick={() => onClick?.(post)}
      className="group relative overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-[#F59E0B] dark:hover:border-[#F59E0B] transition-all duration-300 hover:shadow-xl cursor-pointer"
    >
      {/* Media Thumbnail */}
      <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        {post.isVideo ? (
          <VideoPlayer uri={post.uri} />
        ) : (
          <Image
            src={mediaUrl}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={(e) => {
              // Fallback to emoji if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent && !parent.querySelector('.fallback-emoji')) {
                const fallback = document.createElement('div');
                fallback.className = 'fallback-emoji absolute inset-0 flex items-center justify-center text-6xl bg-[#FEF3C7]';
                fallback.textContent = '🐕';
                parent.appendChild(fallback);
              }
            }}
          />
        )}
        
        {/* Video indicator badge */}
        {post.isVideo && (
          <div className="absolute top-2 right-2 bg-[#F59E0B] text-white px-2 py-1 rounded-full text-xs font-bold shadow-md">
            ▶ Video
          </div>
        )}

        {/* Paw print overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-20 transition-opacity duration-300 z-10 pointer-events-none">
          <span className="text-6xl">🐾</span>
        </div>
      </div>

      {/* Title and Date */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50 line-clamp-2 mb-1">
          {post.title}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatDate(post.creationTimestamp)}
        </p>
      </div>
    </div>
  );
}
