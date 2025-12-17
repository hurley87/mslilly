'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getMediaUrl } from '@/lib/supabase';

interface FeaturedPost {
  uri: string;
  title: string;
  isVideo: boolean;
  creationTimestamp: number;
}

/**
 * Featured gallery component showing Ms. Lilly's best adventures
 * Horizontal scrolling gallery with paw print hover effects
 */
export default function FeaturedGallery() {
  const [featuredPosts, setFeaturedPosts] = useState<FeaturedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load featured posts from the JSON file
    const loadFeaturedPosts = async () => {
      try {
        const response = await fetch('/posts_1.json');
        const posts = await response.json();
        
        // Select a diverse set of posts (mix of photos and videos)
        const selected: FeaturedPost[] = [];
        const seenUris = new Set<string>();
        
        for (const post of posts.slice(0, 100)) {
          if (post.media && Array.isArray(post.media)) {
            for (const media of post.media) {
              if (media.uri && !seenUris.has(media.uri) && selected.length < 6) {
                seenUris.add(media.uri);
                selected.push({
                  uri: media.uri,
                  title: media.title || 'Ms. Lilly\'s Adventure',
                  isVideo: !!media.media_metadata?.video_metadata,
                  creationTimestamp: media.creation_timestamp || 0,
                });
                if (selected.length >= 6) break;
              }
            }
            if (selected.length >= 6) break;
          }
        }
        
        setFeaturedPosts(selected);
      } catch (error) {
        console.error('Failed to load featured posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedPosts();
  }, []);

  const formatDate = (timestamp: number): string => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  };

  if (loading) {
    return (
      <section className="py-16 sm:py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-[#78350F] mb-12">
            Featured Adventures
          </h2>
          <div className="flex justify-center">
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-[#F59E0B] rounded-full animate-bounce" />
              <div className="w-3 h-3 bg-[#F59E0B] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-3 h-3 bg-[#F59E0B] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (featuredPosts.length === 0) {
    return null;
  }

  return (
    <section className="py-16 sm:py-20 relative bg-[#FEF3C7]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-[#78350F] mb-12">
          Featured Adventures
        </h2>
        
        <div className="relative">
          {/* Horizontal scrolling container */}
          <div className="overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex gap-6 lg:gap-8" style={{ width: 'max-content' }}>
              {featuredPosts.map((post, index) => (
                <div
                  key={`${post.uri}-${index}`}
                  className="group relative flex-shrink-0 w-72 sm:w-80 rounded-2xl overflow-hidden bg-[#FEF3C7] border-4 border-transparent hover:border-[#F59E0B] transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer"
                >
                  {/* Paw print overlay on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-20 transition-opacity duration-300 z-10 pointer-events-none">
                    <span className="text-8xl">🐾</span>
                  </div>
                  
                  {/* Media */}
                  <div className="relative w-full aspect-video bg-[#FEF3C7]">
                    {post.isVideo ? (
                      <video
                        src={getMediaUrl(post.uri)}
                        className="w-full h-full object-cover"
                        controls
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <Image
                        src={getMediaUrl(post.uri)}
                        alt={post.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 288px, 320px"
                        priority={index < 3}
                        onError={(e) => {
                          // Fallback to emoji if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.fallback-emoji')) {
                            const fallback = document.createElement('div');
                            fallback.className = 'fallback-emoji absolute inset-0 flex items-center justify-center text-6xl';
                            fallback.textContent = '🐕';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    )}
                    
                    {/* Video indicator */}
                    {post.isVideo && (
                      <div className="absolute top-2 right-2 bg-[#F59E0B] text-white px-2 py-1 rounded-full text-xs font-bold">
                        ▶ Video
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="p-4">
                    <p className="text-sm font-medium text-[#78350F] line-clamp-2 mb-2">
                      {post.title.substring(0, 100)}...
                    </p>
                    <p className="text-xs text-[#92400E]">
                      {formatDate(post.creationTimestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Scroll hint */}
          {featuredPosts.length > 3 && (
            <div className="flex justify-center mt-4">
              <p className="text-sm text-[#92400E] flex items-center gap-2">
                <span>←</span>
                <span>Scroll to see more adventures</span>
                <span>→</span>
              </p>
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}