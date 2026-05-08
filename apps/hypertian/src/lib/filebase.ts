import 'server-only';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getFilebaseEnv } from '@/lib/env';
import { assertValidFilebaseUpload, getFilebasePublicUrl } from '@/lib/filebase-shared';

export const FILEBASE_ENDPOINT = 'https://s3.filebase.com';
export const FILEBASE_REGION = 'us-east-1';

export async function createFilebasePresignedUpload(input: {
  fileName: string;
  contentType: string;
  fileSize: number;
}) {
  const env = getFilebaseEnv();
  const fileName = assertValidFilebaseUpload(input);
  const key = `banners/${new Date().toISOString().slice(0, 10)}/${fileName}`;
  const client = new S3Client({
    endpoint: FILEBASE_ENDPOINT,
    region: FILEBASE_REGION,
    credentials: {
      accessKeyId: env.FILEBASE_ACCESS_KEY_ID,
      secretAccessKey: env.FILEBASE_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });

  const command = new PutObjectCommand({
    Bucket: env.FILEBASE_BUCKET,
    Key: key,
    ContentType: input.contentType,
    ContentLength: input.fileSize,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
  const publicUrl = getFilebasePublicUrl({
    bucket: env.FILEBASE_BUCKET,
    key,
    publicBaseUrl: env.NEXT_PUBLIC_FILEBASE_PUBLIC_BASE_URL,
  });

  return {
    uploadUrl,
    publicUrl,
    key,
    contentType: input.contentType,
    expiresIn: 300,
  };
}
