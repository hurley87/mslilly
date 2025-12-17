import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Common UTF-8 encoding issues and their corrections
 * These occur when UTF-8 encoded characters are misinterpreted as Latin-1/Windows-1252
 */
const ENCODING_FIXES: Array<[string | RegExp, string]> = [
  // Smart apostrophe/quotes (most common)
  [/\u00e2\u0080\u0099/g, "'"], // Right single quotation mark → apostrophe
  [/\u00e2\u0080\u0098/g, "'"], // Left single quotation mark → apostrophe
  [/\u00e2\u0080\u009c/g, '"'], // Left double quotation mark → double quote
  [/\u00e2\u0080\u009d/g, '"'], // Right double quotation mark → double quote
  [/\u00e2\u0080\u0093/g, '-'], // En dash → hyphen
  [/\u00e2\u0080\u0094/g, '--'], // Em dash → double hyphen
  [/\u00e2\u0080\u00a6/g, '...'], // Horizontal ellipsis → three dots
  
  // Other common encoding issues
  [/\u00c2\u00a0/g, ' '], // Non-breaking space → regular space
  [/\u00e2\u0080\u0082/g, ' '], // En space → regular space
  [/\u00e2\u0080\u0083/g, ' '], // Em space → regular space
  
  // Fix the specific pattern from the image: "thereâ€ s" → "there's"
  [/â€ /g, "'"], // Common mojibake pattern for apostrophe
  [/â€™/g, "'"], // Another variant
  [/â€œ/g, '"'], // Left quote variant
  [/â€\u009d/g, '"'], // Right quote variant
];

/**
 * Cleans encoding issues from a string
 */
function cleanText(text: string): string {
  if (typeof text !== 'string') {
    return text;
  }
  
  let cleaned = text;
  
  // Apply all encoding fixes
  for (const [pattern, replacement] of ENCODING_FIXES) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  
  return cleaned;
}

/**
 * Recursively cleans all string values in an object or array
 */
function cleanObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return cleanText(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(cleanObject);
  }
  
  if (obj !== null && typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = cleanObject(value);
    }
    return cleaned;
  }
  
  return obj;
}

/**
 * Main function to clean the posts JSON file
 */
function cleanPostsJson() {
  console.log('Loading posts from posts_1.json...');
  
  const postsPath = join(process.cwd(), 'public', 'posts_1.json');
  const rawContent = readFileSync(postsPath, 'utf-8');
  
  console.log('Parsing JSON...');
  const posts = JSON.parse(rawContent);
  
  console.log(`Found ${posts.length} posts`);
  console.log('Cleaning text encoding issues...');
  
  // Clean all text fields
  const cleanedPosts = cleanObject(posts);
  
  // Create backup
  const backupPath = join(process.cwd(), 'public', 'posts_1.json.backup');
  console.log(`Creating backup at ${backupPath}...`);
  writeFileSync(backupPath, rawContent, 'utf-8');
  
  // Write cleaned JSON
  console.log('Writing cleaned JSON...');
  const cleanedContent = JSON.stringify(cleanedPosts, null, 2);
  writeFileSync(postsPath, cleanedContent, 'utf-8');
  
  console.log('\n✓ Successfully cleaned posts_1.json');
  console.log(`✓ Backup saved to posts_1.json.backup`);
  console.log(`✓ Original size: ${(rawContent.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`✓ Cleaned size: ${(cleanedContent.length / 1024 / 1024).toFixed(2)} MB`);
  
  // Show some examples of what was fixed
  console.log('\nExamples of fixes:');
  console.log('  • \\u00e2\\u0080\\u0099 → \'');
  console.log('  • \\u00e2\\u0080\\u0098 → \'');
  console.log('  • \\u00e2\\u0080\\u009c → "');
  console.log('  • \\u00e2\\u0080\\u009d → "');
  console.log('  • â€  → \'');
}

// Run the script
cleanPostsJson();
