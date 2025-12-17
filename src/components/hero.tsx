'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getMediaUrl } from '@/lib/supabase';

/**
 * Ancient Basset Sayings to rotate in the hero section
 */
const ANCIENT_SAYINGS = [
  "Bark loud and proud",
  "Dig deeper and sniff like no one's waiting",
  "Never leave your audience wanting more",
  "Quality treats and a platter of cheese",
  "If scratching doesn't work then try barking",
  "Be the best that you can be",
] as const;

/**
 * Hero section introducing Ms. Lilly
 * Features playful title, photo frame, CTA button, and rotating quotes
 */
export default function Hero() {
  const [currentSaying, setCurrentSaying] = useState(0);

  // Rotate through Ancient Basset Sayings
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSaying((prev) => (prev + 1) % ANCIENT_SAYINGS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Find a good photo of Ms. Lilly from the posts
  // Using a placeholder path - you may want to pick a specific photo
  const heroImagePath = getMediaUrl('media/posts/202107/17886391928351523.jpg');
  const [imageError, setImageError] = useState(false);

  return (
    <section className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 paw-pattern opacity-30" aria-hidden="true" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Image Section */}
          <div className="shrink-0 relative">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96">
              {/* Bone-shaped decorative frame */}
              <div className="absolute inset-0 border-8 border-[#F59E0B] rounded-3xl transform rotate-3 opacity-20" />
              <div className="absolute inset-2 border-4 border-[#FB7185] rounded-2xl transform -rotate-2 opacity-30" />
              
              {/* Main image */}
              <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-[#FEF3C7] flex items-center justify-center">
                {!imageError ? (
                  <Image
                    src={heroImagePath}
                    alt="Ms. Lilly, the sassiest basset hound"
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 640px) 256px, (max-width: 1024px) 320px, 384px"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="text-8xl">🐕</div>
                )}
              </div>
              
              {/* Decorative paw prints */}
              <div className="absolute -top-4 -right-4 text-6xl opacity-20 animate-paw-float">
                🐾
              </div>
              <div className="absolute -bottom-4 -left-4 text-5xl opacity-20 animate-paw-float" style={{ animationDelay: '1s' }}>
                🐾
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[#78350F] mb-4">
              Woof! I'm{' '}
              <span className="text-[#F59E0B] relative inline-block">
                Ms. Lilly
                <span className="absolute -bottom-2 left-0 right-0 h-2 bg-[#FB7185] opacity-30 rounded-full" />
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-[#92400E] mb-6 font-medium">
              The sassiest basset with the wisest sayings
            </p>
            
            <p className="text-lg text-[#92400E] mb-8 max-w-2xl mx-auto lg:mx-0">
              Ask me about my adventures, treats, The Warden, or my garden crimes.
              I'll share stories and photos with you! *wags tail*
            </p>

            {/* Rotating Ancient Basset Saying */}
            <div className="mb-8 min-h-12 flex items-center justify-center lg:justify-start">
              <div className="relative">
                <p className="text-lg sm:text-xl text-[#F59E0B] font-semibold italic">
                  "{ANCIENT_SAYINGS[currentSaying]}"
                </p>
                <p className="text-sm text-[#92400E] mt-1">
                  — Ancient Basset Saying
                </p>
              </div>
            </div>

            {/* CTA Button - Scrolls to bottom to see chat FAB */}
            <button
              onClick={() => {
                // Scroll to bottom where chat FAB is visible
                window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#F59E0B] text-white text-lg font-bold rounded-full shadow-lg hover:bg-[#D97706] hover:shadow-xl transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#F59E0B] focus:ring-opacity-50"
            >
              <span>Ask Me Anything</span>
              <span className="text-2xl animate-bounce">🐕</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}