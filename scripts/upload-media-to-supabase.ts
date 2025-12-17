import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { readdir } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

// Load .env.local manually (tsx doesn't auto-load env files)
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

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use service role key for uploads (bypasses RLS), fall back to anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  console.error('\nPlease add these to your .env.local file');
  console.error('Get the service_role key from: Supabase Dashboard → Settings → API');
  process.exit(1);
}

if (!isServiceRoleKey) {
  console.warn('⚠️  Warning: Using anon key instead of service role key.');
  console.warn('   Uploads may fail due to RLS policies.');
  console.warn('   Add SUPABASE_SERVICE_ROLE_KEY to .env.local for reliable uploads.\n');
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'media';
const MEDIA_DIR = join(process.cwd(), 'public', 'media');

/**
 * Recursively get all files in a directory
 */
async function getAllFiles(dir: string, baseDir: string = dir): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Get the relative path for Supabase storage (removes public/media prefix)
 */
function getStoragePath(filePath: string): string {
  const relativePath = filePath.replace(MEDIA_DIR, '').replace(/^[/\\]/, '');
  return relativePath.replace(/\\/g, '/'); // Normalize to forward slashes
}

/**
 * Upload a single file to Supabase Storage
 */
async function uploadFile(filePath: string, storagePath: string): Promise<boolean> {
  try {
    const fileContent = readFileSync(filePath);
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileContent, {
        upsert: true, // Overwrite if exists
        contentType: getContentType(filePath),
      });

    if (error) {
      console.error(`  ❌ Failed: ${error.message}`);
      // Check for specific error types
      if (error.message.includes('row-level security')) {
        console.error(`\n⚠️  RLS Error: Add SUPABASE_SERVICE_ROLE_KEY to .env.local`);
        console.error(`   Get it from: Supabase Dashboard → Settings → API → service_role`);
        process.exit(1);
      }
      if (error.message.includes('not found') || error.message.includes('Bucket')) {
        console.error(`\n⚠️  Bucket "${BUCKET_NAME}" may not exist. Create it in Supabase Dashboard.`);
      }
      return false;
    }
    return true;
  } catch (error) {
    console.error(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Get content type based on file extension
 */
function getContentType(filePath: string): string {
  const ext = filePath.toLowerCase().split('.').pop();
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    srt: 'text/plain',
  };
  return contentTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Main upload function
 */
async function main() {
  console.log('🚀 Starting media upload to Supabase Storage...\n');

  // Note: We skip the listBuckets() check because the anon key doesn't have permission
  // to list buckets (RLS restriction). The bucket will be verified on first upload.
  console.log(`📦 Using bucket "${BUCKET_NAME}" (will verify on first upload)\n`);

  // Get all files
  console.log('📁 Scanning media directory...');
  const files = await getAllFiles(MEDIA_DIR);
  console.log(`✓ Found ${files.length} files to upload\n`);

  if (files.length === 0) {
    console.log('⚠️  No files found in public/media/');
    process.exit(0);
  }

  // Upload files with progress
  let successCount = 0;
  let failCount = 0;
  const batchSize = 10; // Upload 10 files at a time

  console.log('📤 Uploading files...\n');

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(files.length / batchSize);

    console.log(`Batch ${batchNum}/${totalBatches} (${batch.length} files)...`);

    const uploadPromises = batch.map(async (filePath) => {
      const storagePath = getStoragePath(filePath);
      const fileName = storagePath.split('/').pop();
      process.stdout.write(`  Uploading ${fileName}... `);

      const success = await uploadFile(filePath, storagePath);
      if (success) {
        successCount++;
        console.log('✓');
      } else {
        failCount++;
      }
    });

    await Promise.all(uploadPromises);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Upload Summary:');
  console.log(`   ✓ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   Total: ${files.length}`);
  console.log('='.repeat(50) + '\n');

  if (failCount === 0) {
    console.log('🎉 All files uploaded successfully!');
  } else {
    console.log(`⚠️  ${failCount} file(s) failed to upload. Check errors above.`);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
