import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';
import { embedMany } from 'ai';
import { google } from '@ai-sdk/google';

// #region agent log
const logPath = join(process.cwd(), '.cursor', 'debug.log');
const debugLog = (hypothesisId: string, message: string, data: Record<string, unknown>) => {
  const entry = JSON.stringify({ hypothesisId, message, data, timestamp: Date.now() });
  console.log(`[DEBUG-${hypothesisId}] ${message}:`, JSON.stringify(data));
  try { appendFileSync(logPath, entry + '\n'); } catch {}
};
// #endregion

// #region agent log - Load .env.local manually (FIX: tsx doesn't auto-load env files)
const envLocalPath = join(process.cwd(), '.env.local');
const envPath = join(process.cwd(), '.env');

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// Load .env first, then .env.local (local overrides)
loadEnvFile(envPath);
loadEnvFile(envLocalPath);

debugLog('A', 'After loading env files', {
  cwd: process.cwd(),
  envLocalExists: existsSync(envLocalPath),
  envExists: existsSync(envPath),
});
// #endregion

// #region agent log - Hypothesis B: Check all env vars with GOOGLE in name
const googleEnvVars = Object.keys(process.env).filter(k => k.includes('GOOGLE'));
debugLog('B', 'Checking GOOGLE env vars after load', {
  googleEnvVars,
  hasTargetKey: 'GOOGLE_GENERATIVE_AI_API_KEY' in process.env,
  targetKeyValue: process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'SET (hidden)' : 'UNDEFINED'
});
// #endregion

interface Post {
  media: Array<{
    uri: string;
    title?: string;
    creation_timestamp?: number;
  }>;
}

interface PostEmbedding {
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

/**
 * Generates embeddings for all post titles and saves them to embeddings.json
 */
async function generateEmbeddings() {
  console.log('Loading posts from posts_1.json...');
  
  const postsPath = join(process.cwd(), 'public', 'posts_1.json');
  const posts: Post[] = JSON.parse(readFileSync(postsPath, 'utf-8'));
  
  console.log(`Found ${posts.length} posts`);
  
  // Extract titles and media URIs
  const itemsToEmbed: Array<{
    postIndex: number;
    mediaIndex: number;
    title: string;
    uri: string;
    isVideo: boolean;
    creationTimestamp: number;
  }> = [];
  
  let skippedCount = 0;
  
  for (let postIndex = 0; postIndex < posts.length; postIndex++) {
    const post = posts[postIndex];
    if (!post.media || post.media.length === 0) continue;
    
    for (let mediaIndex = 0; mediaIndex < post.media.length; mediaIndex++) {
      const media = post.media[mediaIndex];
      if (!media.title || media.title.trim() === '') continue;
      
      // Validate that the media file exists
      const mediaPath = join(process.cwd(), 'public', media.uri);
      if (!existsSync(mediaPath)) {
        skippedCount++;
        console.log(`Skipping: ${media.uri} (file not found)`);
        continue;
      }
      
      // Require creation_timestamp
      if (!media.creation_timestamp) {
        skippedCount++;
        console.log(`Skipping: ${media.uri} (missing creation_timestamp)`);
        continue;
      }
      
      itemsToEmbed.push({
        postIndex,
        mediaIndex,
        title: media.title,
        uri: media.uri,
        isVideo: media.uri.endsWith('.mp4'),
        creationTimestamp: media.creation_timestamp,
      });
    }
  }
  
  if (skippedCount > 0) {
    console.log(`Skipped ${skippedCount} items due to missing files or timestamps`);
  }
  
  console.log(`Found ${itemsToEmbed.length} titles to embed`);
  
  if (itemsToEmbed.length === 0) {
    console.error('No titles found to embed');
    process.exit(1);
  }
  
  // Check for API key
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('Error: GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set');
    console.error('Please add it to your .env.local file');
    process.exit(1);
  }
  
  const model = google.textEmbeddingModel('text-embedding-004');
  const batchSize = 100;
  const embeddings: PostEmbedding[] = [];
  
  console.log(`Generating embeddings in batches of ${batchSize}...`);
  
  // Process in batches
  for (let i = 0; i < itemsToEmbed.length; i += batchSize) {
    const batch = itemsToEmbed.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(itemsToEmbed.length / batchSize);
    
    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)...`);
    
    try {
      const titles = batch.map(item => item.title);
      const { embeddings: batchEmbeddings } = await embedMany({
        model,
        values: titles,
      });
      
      // Combine embeddings with metadata
      for (let j = 0; j < batch.length; j++) {
        embeddings.push({
          postIndex: batch[j].postIndex,
          mediaIndex: batch[j].mediaIndex,
          title: batch[j].title,
          uri: batch[j].uri,
          isVideo: batch[j].isVideo,
          creationTimestamp: batch[j].creationTimestamp,
          embedding: batchEmbeddings[j],
        });
      }
      
      console.log(`✓ Batch ${batchNumber} completed`);
      
      // Small delay to respect rate limits
      if (i + batchSize < itemsToEmbed.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error processing batch ${batchNumber}:`, error);
      throw error;
    }
  }
  
  // Save embeddings
  const outputData: EmbeddingData = {
    posts: embeddings,
    model: 'google/text-embedding-004',
    generatedAt: new Date().toISOString(),
  };
  
  const outputPath = join(process.cwd(), 'public', 'embeddings.json');
  writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
  
  console.log(`\n✓ Successfully generated ${embeddings.length} embeddings`);
  console.log(`✓ Saved to ${outputPath}`);
  console.log(`✓ File size: ${(JSON.stringify(outputData).length / 1024 / 1024).toFixed(2)} MB`);
}

// Run the script
generateEmbeddings().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
