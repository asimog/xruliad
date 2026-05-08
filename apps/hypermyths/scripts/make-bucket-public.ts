import { S3Client, PutBucketAclCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3';

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
  // Try ACL first
  try {
    await client.send(new PutBucketAclCommand({ Bucket: 'videos', ACL: 'public-read' }));
    console.log('ACL set to public-read');
  } catch (e) {
    console.log('ACL failed:', (e as Error).message);
  }

  // Try bucket policy
  try {
    const policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Sid: 'PublicReadGetObject',
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::videos/*'
      }]
    });
    await client.send(new PutBucketPolicyCommand({ Bucket: 'videos', Policy: policy }));
    console.log('Bucket policy set to public');
  } catch (e) {
    console.log('Policy failed:', (e as Error).message);
  }
}
run().catch(e => { console.error(e.message); process.exit(1); });
