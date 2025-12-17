'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import type { SearchResult } from '@/lib/semantic-search';
import { getMediaUrl } from '@/lib/supabase';

/**
 * Sample questions users can click to start a conversation
 * Based on common themes from Ms. Lilly's posts
 */
const SAMPLE_QUESTIONS = [
  "What's your favorite treat?",
  "Tell me about the biscuit dance",
  "Who is The Warden?",
  "What are Ancient Basset Sayings?",
  "Do you like gardening?",
  "What were you like as a puppy?",
] as const;

/**
 * Chat component for conversing with Ms. Lilly the basset hound
 * Floating widget with FAB button and modal interface
 */
export default function Chat() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const isLoading = status === 'streaming' || status === 'submitted';

  /**
   * Extract text content from message (handles both old content and new parts format)
   */
  const getMessageText = (message: any): string => {
    // Try prompt first (user messages)
    if (message.prompt) return message.prompt;
    
    // Try content (legacy format)
    if (message.content) return message.content;
    
    // Try parts array (new UI message format)
    if (message.parts && Array.isArray(message.parts)) {
      const textParts = message.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text || '')
        .join('');
      if (textParts) return textParts;
    }
    
    return '';
  };

  /**
   * Extract search results from stream data
   * Note: Currently not implemented as the API doesn't send search results as stream data
   */
  const getSearchResultsFromData = (): SearchResult[] => {
    // TODO: Implement when API route sends search results as stream data
    return [];
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Auto-resize textarea
   */
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

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
   * Get relative time string (e.g., "Just now", "2 minutes ago")
   */
  const getRelativeTime = (timestamp?: number): string => {
    if (!timestamp) return 'Just now';
    const now = Date.now();
    const diff = now - timestamp * 1000;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    return formatDate(timestamp);
  };

  /**
   * Video player component with click-to-play functionality
   */
  function VideoPlayer({ result }: { result: SearchResult }) {
    const mediaUrl = getMediaUrl(result.uri);

    return (
      <div className="relative w-full rounded-lg overflow-hidden bg-[#FEF3C7]">
        <video
          src={mediaUrl}
          className="w-full h-auto max-h-64 object-contain"
          controls
          playsInline
          preload="metadata"
        />
      </div>
    );
  }

  /**
   * Media gallery component for displaying search results
   */
  function MediaGallery({ media }: { media: SearchResult[] }) {
    if (media.length === 0) return null;

    return (
      <div className="mt-3 space-y-3">
        {media.map((item, index) => (
          <div
            key={`${item.uri}-${index}`}
            className="rounded-xl overflow-hidden border-2 border-[#F59E0B] bg-white shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="relative w-full aspect-video bg-[#FEF3C7]">
              {item.isVideo ? (
                <VideoPlayer result={item} />
              ) : (
                <Image
                  src={getMediaUrl(item.uri)}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 400px"
                />
              )}
            </div>
            <div className="p-3 bg-white">
              <p className="text-xs font-medium text-[#78350F] line-clamp-2 mb-1">
                {item.title}
              </p>
              <p className="text-xs text-[#92400E] flex items-center gap-1">
                <span>🐾</span>
                <span>{formatDate(item.creationTimestamp)}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white shadow-2xl hover:shadow-[#F59E0B]/50 hover:scale-110 transition-all duration-300 flex items-center justify-center group"
          aria-label="Open chat with Ms. Lilly"
        >
          <span className="text-3xl group-hover:animate-tail-wag">🐕</span>
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FB7185] rounded-full flex items-center justify-center text-xs font-bold">
              {messages.length}
            </span>
          )}
        </button>
      )}

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end pointer-events-none">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm animate-fade-in pointer-events-auto"
            onClick={() => setIsOpen(false)}
          />

          {/* Chat Widget - Positioned above FAB button */}
          <div className="relative w-full h-[85vh] sm:h-[700px] sm:w-[500px] sm:max-w-[90vw] sm:rounded-2xl bg-[#FFFBEB] shadow-2xl flex flex-col pointer-events-auto animate-slide-up overflow-hidden mb-24 sm:mb-28 mr-4 sm:mr-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                  🐕
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-base truncate">
                    Chat with Ms. Lilly
                  </h3>
                  <p className="text-white/90 text-xs truncate">
                    Ask me anything!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
                aria-label="Close chat"
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
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto bg-[#FFFBEB] p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="mb-4">
                    <div className="inline-block text-5xl animate-bounce">🐕</div>
                  </div>
                  <h3 className="text-lg font-semibold text-[#78350F] mb-2">
                    Woof! Ready to chat?
                  </h3>
                  <p className="text-sm text-[#92400E] mb-4">
                    Pick a question below or ask me anything! *wags tail*
                  </p>
                  {/* Sample Questions */}
                  <div className="flex flex-col gap-2 max-w-xs mx-auto">
                    {SAMPLE_QUESTIONS.map((question) => (
                      <button
                        key={question}
                        onClick={() => {
                          sendMessage({ parts: [{ type: 'text', text: question }] });
                        }}
                        disabled={isLoading}
                        className="relative px-4 py-2 text-sm font-medium rounded-full bg-[#F59E0B] text-white hover:bg-[#D97706] hover:scale-105 transform transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        style={{
                          clipPath: 'polygon(15% 0%, 85% 0%, 100% 30%, 100% 70%, 85% 100%, 15% 100%, 0% 70%, 0% 30%)',
                        }}
                      >
                        <span className="relative z-10">{question}</span>
                        <span className="absolute top-1 right-1 text-xs opacity-70">🦴</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => {
                const isUser = message.role === 'user';
                // For assistant messages, get search results from stream data
                const isLastAssistantMessage = !isUser && index === messages.length - 1;
                const media = isLastAssistantMessage ? getSearchResultsFromData() : [];
                // UIMessage doesn't have createdAt, so we'll use undefined to show "Just now"
                const messageTime = undefined;

                return (
                  <div key={message.id}>
                    <div
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md ${
                          isUser
                            ? 'bg-[#FB7185] text-white'
                            : 'bg-white text-[#78350F] border-2 border-[#F59E0B]'
                        }`}
                      >
                        <div className="prose prose-sm max-w-none">
                          <p className={`whitespace-pre-wrap wrap-break-word m-0 ${
                            isUser ? 'text-white' : 'text-[#78350F]'
                          }`}>
                            {getMessageText(message)}
                          </p>
                        </div>
                        {!isUser && media.length > 0 && (
                          <MediaGallery media={media} />
                        )}
                      </div>
                    </div>
                    {/* Agent Badge */}
                    {!isUser && (
                      <div className="flex items-center gap-1 mt-1 ml-2 text-xs text-[#92400E]/70">
                        <span className="font-medium">Ms. Lilly</span>
                        <span>•</span>
                        <span>AI Pet</span>
                        <span>•</span>
                        <span>{getRelativeTime(messageTime)}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div>
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white border-2 border-[#F59E0B] shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 bg-[#F59E0B] rounded-full animate-bounce" />
                          <div
                            className="w-2.5 h-2.5 bg-[#FB7185] rounded-full animate-bounce"
                            style={{ animationDelay: '0.15s' }}
                          />
                          <div
                            className="w-2.5 h-2.5 bg-[#10B981] rounded-full animate-bounce"
                            style={{ animationDelay: '0.3s' }}
                          />
                        </div>
                        <span className="text-sm text-[#92400E] font-medium">
                          Thinking...
                        </span>
                        <span className="text-lg">🦴</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-1 ml-2 text-xs text-[#92400E]/70">
                    <span className="font-medium">Ms. Lilly</span>
                    <span>•</span>
                    <span>AI Pet</span>
                    <span>•</span>
                    <span>Just now</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg p-4 bg-red-100 border-2 border-red-300">
                  <p className="text-sm text-red-800 font-medium">
                    {error.message || 'An error occurred'}
                  </p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) {
                  sendMessage({ parts: [{ type: 'text', text: input }] });
                  setInput('');
                }
              }}
              className="border-t border-[#F59E0B]/20 bg-white p-4"
            >
              <div className="flex gap-3 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 resize-none rounded-xl border-2 border-[#F59E0B] bg-[#FFFBEB] px-4 py-3 text-[#78350F] placeholder-[#92400E] placeholder-opacity-60 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:ring-opacity-30 focus:border-[#D97706] disabled:opacity-50 disabled:cursor-not-allowed max-h-32"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim()) {
                        sendMessage({ parts: [{ type: 'text', text: input }] });
                        setInput('');
                      }
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  onClick={(e) => {
                    if (!isLoading && input.trim()) {
                      e.currentTarget.classList.add('animate-bone-bounce');
                      setTimeout(() => {
                        e.currentTarget.classList.remove('animate-bone-bounce');
                      }, 600);
                    }
                  }}
                  className="relative rounded-xl bg-[#F59E0B] text-white px-5 py-3 font-bold hover:bg-[#D97706] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 disabled:hover:scale-100 flex-shrink-0"
                  style={{
                    clipPath: 'polygon(15% 0%, 85% 0%, 100% 30%, 100% 70%, 85% 100%, 15% 100%, 0% 70%, 0% 30%)',
                  }}
                  aria-label="Send message"
                >
                  <span className="relative z-10 flex items-center gap-1 shrink-0">
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
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
