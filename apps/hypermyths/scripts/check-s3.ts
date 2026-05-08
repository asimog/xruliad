import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';

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
  const list = await client.send(new ListObjectsV2Command({ Bucket: 'videos', MaxKeys: 10 }));
  console.log('Total objects in bucket:', list.KeyCount);
  console.log('Keys:', list.Contents?.map(o => o.Key + ' (' + o.Size + ' bytes)'));

  try {
    const head = await client.send(new HeadObjectCommand({
      Bucket: 'videos',
      Key: 'video-renders/fd9a97b6-f200-4448-9d6a-dc82ff8b8040/final.mp4'
    }));
    console.log('orangeape file EXISTS, size:', head.ContentLength);
  } catch (e) {
    console.log('orangeape file MISSING:', (e as Error).message);
  }
}

run().catch(e => { console.error(e.message); process.exit(1); });
