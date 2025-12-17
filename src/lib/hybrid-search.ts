import { embed, cosineSimilarity } from 'ai';
import { google } from '@ai-sdk/google';
import BM25 from 'okapibm25';
import { loadEmbeddings, PostEmbedding, SearchResult } from './semantic-search';

/**
 * Ranked result from a single search system
 */
interface RankedResult {
  postIndex: number;
  mediaIndex: number;
  rank: number; // 1-indexed rank
}

/**
 * Fused result with RRF score
 */
interface FusedResult {
  postIndex: number;
  mediaIndex: number;
  rrfScore: number;
}

/**
 * Tokenizes text into lowercase words, splitting on non-alphanumeric characters
 * @param text - Text to tokenize
 * @returns Array of lowercase tokens
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

/**
 * BM25 search result with score
 */
interface KeywordSearchResult {
  postIndex: number;
  mediaIndex: number;
  rank: number;
  score: number;
}

/**
 * Performs BM25 keyword search and returns ranked results with scores
 * @param query - Search query text
 * @param embeddings - Array of post embeddings with titles
 * @returns Array of ranked results sorted by BM25 score (highest first)
 */
function getKeywordRanks(
  query: string,
  embeddings: PostEmbedding[]
): KeywordSearchResult[] {
  if (!query || query.trim() === '') {
    return [];
  }

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return [];
  }

  // Extract documents (titles) for BM25
  const documents = embeddings.map((post) => post.title);

  // Calculate BM25 scores
  const scores = BM25(documents, queryTokens, { k1: 1.3, b: 0.9 }) as number[];

  // Create results with scores and indices
  const resultsWithScores = embeddings
    .map((post, index) => ({
      postIndex: post.postIndex,
      mediaIndex: post.mediaIndex,
      score: scores[index],
    }))
    // Filter out results with zero or negative scores (not relevant)
    .filter((result) => result.score > 0);

  // Sort by score (highest first) and assign ranks
  return resultsWithScores
    .sort((a, b) => b.score - a.score)
    .map((result, index) => ({
      postIndex: result.postIndex,
      mediaIndex: result.mediaIndex,
      rank: index + 1, // 1-indexed rank
      score: result.score,
    }));
}

/**
 * Performs semantic search and returns ranked results
 * @param query - Search query text
 * @param embeddings - Array of post embeddings
 * @returns Array of ranked results sorted by similarity (highest first)
 */
async function getSemanticRanks(
  query: string,
  embeddings: PostEmbedding[]
): Promise<RankedResult[]> {
  if (!query || query.trim() === '') {
    return [];
  }

  // Check for API key
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      'GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set'
    );
  }

  // Generate embedding for the query
  const model = google.textEmbeddingModel('text-embedding-004');
  const { embedding: queryEmbedding } = await embed({
    model,
    value: query,
  });

  // Calculate similarity scores
  const resultsWithScores = embeddings.map((post) => ({
    postIndex: post.postIndex,
    mediaIndex: post.mediaIndex,
    similarity: cosineSimilarity(queryEmbedding, post.embedding),
  }));

  // Sort by similarity (highest first) and assign ranks
  return resultsWithScores
    .sort((a, b) => b.similarity - a.similarity)
    .map((result, index) => ({
      postIndex: result.postIndex,
      mediaIndex: result.mediaIndex,
      rank: index + 1, // 1-indexed rank
    }));
}

/**
 * Fuses multiple ranked result lists using Reciprocal Rank Fusion (RRF)
 * @param semanticRanks - Ranked results from semantic search
 * @param keywordRanks - Ranked results from keyword search (with scores)
 * @param k - RRF constant (default: 60)
 * @returns Array of fused results sorted by RRF score (highest first)
 */
function fuseRRF(
  semanticRanks: RankedResult[],
  keywordRanks: KeywordSearchResult[],
  k: number = 60
): FusedResult[] {
  // Create a map to store RRF scores for each document
  const rrfScores = new Map<string, number>();

  // Helper to create a unique key for a document
  const getKey = (postIndex: number, mediaIndex: number) =>
    `${postIndex}-${mediaIndex}`;

  // Add contributions from semantic ranks
  semanticRanks.forEach((result) => {
    const key = getKey(result.postIndex, result.mediaIndex);
    const currentScore = rrfScores.get(key) || 0;
    rrfScores.set(key, currentScore + 1 / (k + result.rank));
  });

  // Add contributions from keyword ranks
  keywordRanks.forEach((result) => {
    const key = getKey(result.postIndex, result.mediaIndex);
    const currentScore = rrfScores.get(key) || 0;
    rrfScores.set(key, currentScore + 1 / (k + result.rank));
  });

  // Convert map to array of fused results
  const fusedResults: FusedResult[] = Array.from(rrfScores.entries()).map(
    ([key, score]) => {
      const [postIndex, mediaIndex] = key.split('-').map(Number);
      return {
        postIndex,
        mediaIndex,
        rrfScore: score,
      };
    }
  );

  // Sort by RRF score (highest first)
  return fusedResults.sort((a, b) => b.rrfScore - a.rrfScore);
}

/**
 * Performs hybrid search combining semantic and keyword search using RRF
 * @param query - Search query text
 * @param topK - Number of results to return (default: 10)
 * @returns Array of search results sorted by RRF score (highest first)
 */
export async function hybridSearch(
  query: string,
  topK: number = 10
): Promise<SearchResult[]> {
  if (!query || query.trim() === '') {
    return [];
  }

  // Load embeddings
  const embeddings = loadEmbeddings();

  // Perform both searches in parallel
  const [semanticRanks, keywordRanks] = await Promise.all([
    getSemanticRanks(query, embeddings),
    Promise.resolve(getKeywordRanks(query, embeddings)),
  ]);

  // Fuse results using RRF
  const fusedResults = fuseRRF(semanticRanks, keywordRanks);

  // Create a map of embeddings for quick lookup
  const embeddingMap = new Map(
    embeddings.map((post) => [`${post.postIndex}-${post.mediaIndex}`, post])
  );

  // Convert fused results to SearchResult format
  const results: SearchResult[] = fusedResults
    .slice(0, topK)
    .map((fused) => {
      const key = `${fused.postIndex}-${fused.mediaIndex}`;
      const post = embeddingMap.get(key);
      if (!post) {
        throw new Error(`Post not found: ${key}`);
      }
      return {
        postIndex: post.postIndex,
        mediaIndex: post.mediaIndex,
        title: post.title,
        uri: post.uri,
        isVideo: post.isVideo,
        creationTimestamp: post.creationTimestamp,
        similarity: fused.rrfScore, // Using rrfScore as similarity for display
      };
    });

  return results;
}

/**
 * Performs keyword-only search using BM25
 * @param query - Search query text
 * @param topK - Number of results to return (default: 10)
 * @returns Array of search results sorted by BM25 score (highest first)
 */
export async function keywordSearch(
  query: string,
  topK: number = 10
): Promise<SearchResult[]> {
  if (!query || query.trim() === '') {
    return [];
  }

  // Load embeddings
  const embeddings = loadEmbeddings();

  // Get keyword ranks (includes scores)
  const keywordRanks = getKeywordRanks(query, embeddings);

  // Create a map of embeddings for quick lookup
  const embeddingMap = new Map(
    embeddings.map((post) => [`${post.postIndex}-${post.mediaIndex}`, post])
  );

  // Convert to SearchResult format
  const results: SearchResult[] = keywordRanks
    .slice(0, topK)
    .map((ranked) => {
      const key = `${ranked.postIndex}-${ranked.mediaIndex}`;
      const post = embeddingMap.get(key);
      if (!post) {
        throw new Error(`Post not found: ${key}`);
      }
      return {
        postIndex: post.postIndex,
        mediaIndex: post.mediaIndex,
        title: post.title,
        uri: post.uri,
        isVideo: post.isVideo,
        creationTimestamp: post.creationTimestamp,
        similarity: ranked.score, // BM25 score as similarity
      };
    });

  return results;
}
