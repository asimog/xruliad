// Test ElizaCloud APIs locally with env vars.
const API_KEY =
  process.env.ELIZA_API_KEY ??
  process.env.ELIZA_VIDEO_API_KEY ??
  process.env.ELIZA_CLOUD_API_KEY;
const BASE_URL =
  process.env.ELIZA_VIDEO_BASE_URL ??
  process.env.ELIZA_BASE_URL ??
  "https://www.elizacloud.ai";
const SHOULD_TEST_VIDEO = process.env.ELIZA_SMOKE_TEST_VIDEO === "1";

if (!API_KEY) {
  console.error(
    "Missing Eliza key. Set ELIZA_API_KEY (or ELIZA_VIDEO_API_KEY / ELIZA_CLOUD_API_KEY).",
  );
  process.exit(1);
}

console.log('=== Testing ElizaOS APIs ===\n');

// Test 1: Text API
console.log('1. Testing TEXT API...');
try {
  const textRes = await fetch(`${BASE_URL}/api/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'Say hello in 5 words' }] }],
      id: 'gpt-4o-mini',
      stream: false,
    }),
  });
  console.log(`   Status: ${textRes.status}`);
  const textBody = await textRes.text();
  console.log(`   Response: ${textBody.slice(0, 300)}`);
  
  // Parse SSE
  if (textBody.includes('data:')) {
    const lines = textBody.split('\n').filter(l => l.startsWith('data: '));
    const text = lines
      .map(l => { try { return JSON.parse(l.slice(6)); } catch { return null; } })
      .filter(d => d && d.type === 'text-delta')
      .map(d => d.delta)
      .join('');
    console.log(`   Parsed text: "${text}"`);
  }
  console.log('   ✅ TEXT API works!\n');
} catch (e) {
  console.log(`   ❌ TEXT API failed: ${e.message}\n`);
}

if (SHOULD_TEST_VIDEO) {
  // Test 2: Video API
  console.log('2. Testing VIDEO API...');
  try {
    const videoRes = await fetch(`${BASE_URL}/api/v1/generate-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        prompt: 'A serene mountain landscape with clouds moving slowly',
        duration: 3,
      }),
    });
    console.log(`   Status: ${videoRes.status}`);
    const videoBody = await videoRes.text();
    console.log(`   Response: ${videoBody.slice(0, 500)}`);
    
    try {
      const data = JSON.parse(videoBody);
      const videoUrl =
        data.video?.url || data.video_url || data.url || data.videoUrl;
      if (videoUrl) {
        console.log(`   Video URL: ${videoUrl}`);
        console.log('   ✅ VIDEO API works!\n');
      } else {
        console.log('   ⚠️ No immediate video URL (likely async job response)\n');
      }
    } catch {
      console.log(`   ❌ Invalid JSON response\n`);
    }
  } catch (e) {
    console.log(`   ❌ VIDEO API failed: ${e.message}\n`);
  }
} else {
  console.log(
    '2. Skipping VIDEO API test (set ELIZA_SMOKE_TEST_VIDEO=1 to run it).\n',
  );
}

console.log('=== Done ===');
