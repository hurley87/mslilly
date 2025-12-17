'use client';

import PostsIndex from '@/components/posts-index';
import Chat from '@/components/chat';

/**
 * Main landing page for Ms. Lilly
 * Posts index with search, filtering, and browsing capabilities
 * Includes floating chat widget for conversations
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-[#FFFBEB] font-sans">
      <PostsIndex />
      {/* Floating chat widget - renders as fixed overlay */}
      <Chat />
    </div>
  );
}
