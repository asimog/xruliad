import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT!,
  region: process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

async function run() {
  const key = 'video-renders/fd9a97b6-f200-4448-9d6a-dc82ff8b8040/final.mp4';
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: 'videos', Key: key }),
    { expiresIn: 3600 }
  );
  console.log('Signed URL:', url.slice(0, 120) + '...');
  
  // Test if it works
  const res = await fetch(url);
  console.log('HTTP status:', res.status, 'Content-Type:', res.headers.get('content-type'), 'Size:', res.headers.get('content-length'));
}
run().catch(e => { console.error(e.message); process.exit(1); });
