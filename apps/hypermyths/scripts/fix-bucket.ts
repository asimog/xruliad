import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

async function run() {
  // Check bucket
  const { data: bucket, error: getErr } = await supabase.storage.getBucket('videos');
  console.log('bucket:', JSON.stringify(bucket), 'error:', getErr?.message);

  // Make public
  const { data, error } = await supabase.storage.updateBucket('videos', { public: true, allowedMimeTypes: ['video/mp4', 'video/webm'], fileSizeLimit: null });
  console.log('update result:', JSON.stringify(data), 'error:', error?.message);

  // Verify
  const { data: after } = await supabase.storage.getBucket('videos');
  console.log('bucket is now public:', after?.public);
}
run().catch(e => { console.error(e.message); process.exit(1); });
