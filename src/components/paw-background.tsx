'use client';

import { useState, useEffect } from 'react';

/**
 * Decorative paw print background pattern component
 * Adds subtle animated floating paw prints to sections
 * Uses pseudo-random positioning for natural scattered effect
 */
export default function PawBackground() {
  const [isMounted, setIsMounted] = useState(false);

  // Only render floating paw prints after client-side hydration to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Generate pseudo-random but consistent positions for paw prints
  // Using fixed seeds ensures consistent layout on re-renders
  const pawPrints = Array.from({ length: 20 }, (_, i) => {
    // Simple pseudo-random function using index as seed
    const seed = i * 137.508; // Golden angle approximation
    const x = (Math.sin(seed) * 0.5 + 0.5) * 100; // 0-100%
    const y = (Math.cos(seed * 1.3) * 0.5 + 0.5) * 100; // 0-100%
    const size = 16 + (Math.sin(seed * 2) * 0.5 + 0.5) * 24; // 16-40px
    const rotation = Math.sin(seed * 3) * 25; // -25 to 25 degrees
    const delay = (Math.sin(seed * 4) * 0.5 + 0.5) * 3; // 0-3s delay
    const duration = 4 + (Math.cos(seed * 5) * 0.5 + 0.5) * 2; // 4-6s duration
    
    return { x, y, size, rotation, delay, duration };
  });

  return (
    <div 
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Base repeating pattern */}
      <div className="absolute inset-0 paw-pattern opacity-30" />
      
      {/* Floating animated paw prints - only render after hydration */}
      {isMounted && pawPrints.map((paw, index) => (
        <svg
          key={index}
          className="absolute animate-paw-drift animate-paw-fade"
          style={{
            left: `${paw.x}%`,
            top: `${paw.y}%`,
            width: `${paw.size}px`,
            height: `${paw.size}px`,
            transform: `rotate(${paw.rotation}deg)`,
            animationDelay: `${paw.delay}s`,
            animationDuration: `${paw.duration}s`,
            opacity: 0.1,
          }}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main pad */}
          <ellipse cx="12" cy="16" rx="4" ry="5" fill="currentColor" fillOpacity="0.6" />
          {/* Top left toe */}
          <ellipse cx="8" cy="8" rx="2.5" ry="3" fill="currentColor" fillOpacity="0.6" />
          {/* Top right toe */}
          <ellipse cx="16" cy="8" rx="2.5" ry="3" fill="currentColor" fillOpacity="0.6" />
          {/* Bottom left toe */}
          <ellipse cx="6" cy="12" rx="2" ry="2.5" fill="currentColor" fillOpacity="0.6" />
          {/* Bottom right toe */}
          <ellipse cx="18" cy="12" rx="2" ry="2.5" fill="currentColor" fillOpacity="0.6" />
        </svg>
      ))}
    </div>
  );
}