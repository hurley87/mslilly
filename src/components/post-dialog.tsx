'use client';

import { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Image from 'next/image';
import { getMediaUrl } from '@/lib/supabase';
import type { PostCardData } from './post-card';

interface PostDialogProps {
  post: PostCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
 * Video player component for dialog
 */
function DialogVideoPlayer({ uri }: { uri: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaUrl = getMediaUrl(uri);

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
    <div className="relative w-full aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden cursor-pointer group" onClick={handleClick}>
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
          <p className="text-sm text-center">{errorMessage || 'Video unavailable'}</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            src={mediaUrl}
            className="w-full h-full object-contain"
            controls={isPlaying}
            muted
            playsInline
            preload="metadata"
            onEnded={handleVideoEnded}
            onLoadedMetadata={handleVideoLoadedMetadata}
            onError={handleVideoError}
          />
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <div className="w-20 h-20 rounded-full bg-black/70 dark:bg-white/70 backdrop-blur-sm flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-white dark:text-black ml-1"
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
 * Dialog component for displaying full post details
 * Shows media, full text, and date
 */
export default function PostDialog({ post, open, onOpenChange }: PostDialogProps) {
  if (!post) return null;

  const mediaUrl = getMediaUrl(post.uri);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 data-[state=open]:opacity-100 data-[state=closed]:opacity-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-3xl max-h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-0 overflow-hidden transition-all duration-300 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=closed]:scale-95">
          {/* Close Button */}
          <Dialog.Close className="absolute right-4 top-4 z-10 rounded-full p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:ring-offset-2">
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
          </Dialog.Close>

          {/* Scrollable Content */}
          <div className="overflow-y-auto max-h-[90vh]">
            {/* Media Section */}
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 p-6">
              {post.isVideo ? (
                <DialogVideoPlayer uri={post.uri} />
              ) : (
                <div className="relative w-full aspect-video bg-zinc-200 dark:bg-zinc-700 rounded-lg overflow-hidden">
                  <Image
                    src={mediaUrl}
                    alt={post.title}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 768px"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.fallback-emoji')) {
                        const fallback = document.createElement('div');
                        fallback.className = 'fallback-emoji absolute inset-0 flex items-center justify-center text-6xl bg-[#FEF3C7] dark:bg-[#78350F]';
                        fallback.textContent = '🐕';
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="p-6 space-y-4">
              {/* Date */}
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>{formatDate(post.creationTimestamp)}</span>
              </div>

              {/* Full Post Text */}
              <div className="prose prose-zinc dark:prose-invert max-w-none">
                <p className="text-base leading-relaxed text-zinc-900 dark:text-zinc-50 whitespace-pre-wrap wrap-break-word">
                  {post.title}
                </p>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
