import { db } from '../lib/db';

const jobId = process.argv[2];
if (!jobId) { console.error('Usage: npx tsx scripts/reset-job.ts <jobId>'); process.exit(1); }

async function run() {
  const job = await db.job.findUnique({ where: { jobId } });
  console.log('Current status:', job?.status);
  if (!job) { console.error('Job not found'); process.exit(1); }

  await db.job.update({
    where: { jobId },
    data: {
      status: 'failed',
      progress: 'failed',
      errorCode: 'video_missing',
      errorMessage: 'Video file not found in Supabase storage - re-rendering.'
    }
  });

  await db.video.update({
    where: { jobId },
    data: { videoUrl: null, renderStatus: 'queued' }
  });

  const updated = await db.job.findUnique({ where: { jobId } });
  console.log('Updated status:', updated?.status);
}

run().catch(e => { console.error(e.message); process.exit(1); });
