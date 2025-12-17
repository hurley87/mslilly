import { readFileSync } from 'fs';
import { join } from 'path';
import { embed, cosineSimilarity } from 'ai';
import { google } from '@ai-sdk/google';

export interface PostEmbedding {
  postIndex: number;
  mediaIndex: number;
  title: string;
  uri: string;
  isVideo: boolean;
  creationTimestamp: number;
  embedding: number[];
}

interface EmbeddingData {
  posts: PostEmbedding[];
  model: string;
  generatedAt: string;
}

export interface SearchResult {
  postIndex: number;
  mediaIndex: number;
  title: string;
  uri: string;
  isVideo: boolean;
  creationTimestamp: number;
  similarity: number;
}

let cachedEmbeddings: PostEmbedding[] | null = null;

/**
 * Loads embeddings from the JSON file (cached after first load)
 */
export function loadEmbeddings(): PostEmbedding[] {
  if (cachedEmbeddings) {
    return cachedEmbeddings;
  }

  try {
    const embeddingsPath = join(process.cwd(), 'public', 'embeddings.json');
    const data: EmbeddingData = JSON.parse(
      readFileSync(embeddingsPath, 'utf-8')
    );
    cachedEmbeddings = data.posts;
    return cachedEmbeddings;
  } catch (error) {
    throw new Error(
      `Failed to load embeddings: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure to run the generate-embeddings script first.`
    );
  }
}

/**
 * Searches posts using semantic similarity
 * @param query - The search query text
 * @param topK - Number of results to return (default: 10)
 * @returns Array of search results sorted by similarity (highest first)
 */
export async function searchPosts(
  query: string,
  topK: number = 10
): Promise<SearchResult[]> {
  if (!query || query.trim() === '') {
    return [];
  }

  // Check for API key
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      'GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set'
    );
  }

  // Load embeddings
  const embeddings = loadEmbeddings();

  // Generate embedding for the query
  const model = google.textEmbeddingModel('text-embedding-004');
  const { embedding: queryEmbedding } = await embed({
    model,
    value: query,
  });

  // Calculate similarity scores
  const results: SearchResult[] = embeddings.map((post) => ({
    postIndex: post.postIndex,
    mediaIndex: post.mediaIndex,
    title: post.title,
    uri: post.uri,
    isVideo: post.isVideo,
    creationTimestamp: post.creationTimestamp,
    similarity: cosineSimilarity(queryEmbedding, post.embedding),
  }));

  // Sort by similarity (highest first) and return top K
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

