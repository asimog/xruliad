/**
 * Upload MP3 files to Supabase Storage and generate playlist.json
 *
 * Usage: node scripts/upload-music-playlist.mjs
 *
 * Reads MP3 files from the music source directory, uploads them to Supabase
 * Storage (videos/music/ prefix), and generates playlist.json.
 */

import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
} from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Load environment variables from .env.local
const envPath = join(rootDir, ".env.local");
let envContent = "";
try {
  envContent = readFileSync(envPath, "utf-8");
} catch {
  console.error("❌ .env.local not found. Please create it first.");
  process.exit(1);
}

// Parse env vars manually
const envVars = {};
envContent.split("\n").forEach((line) => {
  line = line.trim();
  if (!line || line.startsWith("#")) return;
  const [key, ...valueParts] = line.split("=");
  const value = valueParts.join("=").replace(/^["']|["']$/g, "");
  envVars[key.trim()] = value;
});

const S3_ACCESS_KEY_ID = envVars.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = envVars.S3_SECRET_ACCESS_KEY;
const S3_PUBLIC_URL = envVars.S3_PUBLIC_URL;
const S3_ENDPOINT =
  envVars.S3_ENDPOINT || "https://tdwtvbpvljdwsneggxcu.supabase.co";

if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_PUBLIC_URL) {
  console.error("❌ Missing S3 environment variables in .env.local");
  console.error(
    "Required: S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL",
  );
  process.exit(1);
}

// Supabase S3 client
const s3Client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: "auto",
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

// Sanitize filename for Supabase S3 compatibility
function sanitizeFileName(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid chars
    .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII (Unicode, emojis)
    .replace(/[\u{1D400}-\u{1D7FF}]/gu, "") // Remove math bold Unicode
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/'/g, "") // Remove apostrophes
    .replace(/\[|\]|\(|\)/g, "") // Remove brackets
    .replace(/@/g, "at") // Replace @ with 'at'
    .replace(/&/g, "and") // Replace & with 'and'
    .replace(/~/g, "-") // Replace ~ with -
    .trim();
}

const BUCKET_NAME = "videos";
const PREFIX = "music/";

// Music source directory - adjust this path to where your 74 MP3s are
const RAW_MUSIC_SOURCE_DIR = envVars.MUSIC_SOURCE_DIR || "D:/website music";

function normalizeSourceDir(input) {
  if (!input) return input;
  if (existsSync(input)) return input;
  const windowsDrive = input.match(/^([a-zA-Z]):[\\/](.*)$/);
  if (!windowsDrive) return input;
  const [, drive, rest] = windowsDrive;
  const wslPath = `/mnt/${drive.toLowerCase()}/${rest.replace(/\\/g, "/")}`;
  return wslPath;
}

const MUSIC_SOURCE_DIR = normalizeSourceDir(RAW_MUSIC_SOURCE_DIR);

console.log("🎵 HyperCinema Music Playlist Uploader");
console.log("=".repeat(50));
console.log(`📁 Source directory: ${MUSIC_SOURCE_DIR}`);
console.log(`🪣 Supabase bucket: ${BUCKET_NAME}/${PREFIX}`);
console.log("");

// Check if source directory exists
if (!existsSync(MUSIC_SOURCE_DIR)) {
  console.error(`❌ Source directory not found: ${MUSIC_SOURCE_DIR}`);
  console.error("");
  console.error(
    "Place your 74 MP3 files in a directory and set MUSIC_SOURCE_DIR in .env.local",
  );
  console.error("Example: MUSIC_SOURCE_DIR=D:/path/to/your/mp3s");
  process.exit(1);
}

// Get all MP3 files
const mp3Files = readdirSync(MUSIC_SOURCE_DIR)
  .filter((f) => extname(f).toLowerCase() === ".mp3")
  .sort();

if (mp3Files.length === 0) {
  console.error("❌ No MP3 files found in source directory");
  process.exit(1);
}

console.log(`✅ Found ${mp3Files.length} MP3 files`);
console.log("");

// Upload files
const playlistTracks = [];
let uploadedCount = 0;
let skippedCount = 0;

for (const fileName of mp3Files) {
  const filePath = join(MUSIC_SOURCE_DIR, fileName);
  const sanitizedFileName = sanitizeFileName(fileName);
  const key = `${PREFIX}${sanitizedFileName}`;
  const fileContent = readFileSync(filePath);

  try {
    // Check if file already exists
    const listCmd = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: key,
      MaxKeys: 1,
    });
    const existing = await s3Client.send(listCmd);

    if (existing.Contents && existing.Contents.length > 0) {
      console.log(`⏭️  Skipped (exists): ${sanitizedFileName}`);
      skippedCount++;
    } else {
      // Upload file
      const putCmd = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileContent,
        ContentType: "audio/mpeg",
        CacheControl: "public, max-age=31536000",
      });
      await s3Client.send(putCmd);
      console.log(`✅ Uploaded: ${sanitizedFileName}`);
      uploadedCount++;
    }

    // Generate public URL
    // Parse S3_PUBLIC_URL to get base URL
    const baseUrl = S3_PUBLIC_URL.replace(/\/+$/, "");
    const publicUrl = `${baseUrl}/${key}`;

    // Add to playlist - keep original name for display, use sanitized URL
    const label = fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    playlistTracks.push({
      title: label,
      url: publicUrl,
      seed: `music:${sanitizedFileName}`,
    });
  } catch (error) {
    console.error(`❌ Failed to upload ${fileName}:`, error.message);
  }
}

console.log("");
console.log("=".repeat(50));
console.log(
  `📊 Upload summary: ${uploadedCount} uploaded, ${skippedCount} skipped`,
);

// Generate playlist.json
const playlistPath = join(rootDir, "public", "music", "playlist.json");
const musicDir = join(rootDir, "public", "music");

// Ensure directory exists
if (!existsSync(musicDir)) {
  mkdirSync(musicDir, { recursive: true });
}

const playlist = {
  tracks: playlistTracks,
  generatedAt: new Date().toISOString(),
  totalTracks: playlistTracks.length,
};

writeFileSync(playlistPath, JSON.stringify(playlist, null, 2), "utf-8");
console.log(`📝 Generated playlist.json with ${playlistTracks.length} tracks`);
console.log(`📄 Location: ${playlistPath}`);
console.log("");
console.log("✅ Done! Next steps:");
console.log("   1. Commit and push to deploy");
console.log("   2. Vercel will serve the playlist from /music/playlist.json");
console.log("   3. The app will auto-load tracks from Supabase on startup");
