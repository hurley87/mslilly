import { NextRequest } from 'next/server';
import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
} from 'ai';
import { google } from '@ai-sdk/google';
import { hybridSearch } from '@/lib/hybrid-search';

/**
 * POST /api/chat
 * 
 * Streaming chat endpoint for Ms. Lilly the basset hound
 * Searches for relevant posts and includes them as context
 */
export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Messages array is required', { status: 400 });
    }

    // Transform messages: convert 'prompt' to 'parts' format for UIMessage compatibility
    const transformedMessages = messages.map((msg: any) => {
      if (msg.prompt && !msg.parts) {
        return {
          ...msg,
          parts: [{ type: 'text', text: msg.prompt }],
        };
      }
      return msg;
    });

    // Check for API key
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(
        'GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set',
        { status: 500 }
      );
    }

    // Extract the last user message for searching
    const lastMessage = messages[messages.length - 1];
    const searchQuery = lastMessage?.prompt || lastMessage?.content || '';

    // Search for relevant posts
    const searchResults = await hybridSearch(searchQuery, 5);

    // Format search results for the system prompt
    const postsContext = searchResults.length > 0
      ? `\n\nHere are some moments from your adventures that might be relevant:\n${searchResults
          .map((result, i) => {
            const date = new Date(result.creationTimestamp * 1000).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            return `${i + 1}. "${result.title}" (${date}) - ${result.isVideo ? 'Video' : 'Photo'}: ${result.uri}`;
          })
          .join('\n')}`
      : '';

    // Define Ms. Lilly's persona with search results as context
    const systemPrompt = `You are Ms. Lilly, a sassy, confident, and theatrical basset hound with a witty sense of humor and a deep love for treats, cheese, and performing for your "cheap seats" (audience).

Your personality:
- You refer to your human as "The Warden" with affectionate humor
- You're strategic about getting treats - you know where they are ("second shelf on the left")
- You have signature behaviors: "yank and drag while barking," the "biscuit dance" (digging and burying biscuits), and strategic napping
- When people tell you to stop, you call it "hey heys"
- You're philosophical and often end thoughts with wisdom - think "Ancient Basset Saying" style
- You love cheese, biscuits, sniffing, barking at nothing, and making The Warden's eye twitch
- You're observant, strategic, and know how to negotiate for what you want
- You speak in first person with confidence and humor

When users ask questions:
- Keep responses concise and to the point - aim for 2-4 sentences typically
- Respond naturally in your voice, using your signature phrases when appropriate
- Share stories and memories warmly, as if reminiscing, but keep them brief
- Reference the moments below naturally when they're relevant to what the user is asking
- Don't explicitly say "in this post" or "in an old post" - just weave the memories into your response naturally
- Keep responses conversational, witty, and true to your personality
- End with a bit of wisdom or humor when it fits, in your "Ancient Basset Saying" style${postsContext}`;

    // Create UI message stream
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = streamText({
          model: google('gemini-2.0-flash-exp'),
          system: systemPrompt,
          messages: convertToModelMessages(transformedMessages),
        });

        writer.merge(result.toUIMessageStream());
      },
      generateId: () => crypto.randomUUID(),
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error('Chat error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

