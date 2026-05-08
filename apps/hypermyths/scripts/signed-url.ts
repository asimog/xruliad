import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT!,
  region: process.env.S3_REGION ?? 'us-east-1',
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
  forcePathStyle: true,
});

async function run() {
  const jobId = process.argv[2];
  const key = `video-renders/${jobId}/final.mp4`;

  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: 'videos', Key: key }));
    console.log('File size:', head.ContentLength, 'bytes');
  } catch {
    console.log('File NOT found in S3');
    return;
  }

  const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: 'videos', Key: key }), { expiresIn: 86400 });
  console.log('\nSigned URL (24h):\n' + url);
}
run().catch(e => { console.error(e.message); process.exit(1); });
