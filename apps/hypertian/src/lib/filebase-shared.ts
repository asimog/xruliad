export const FILEBASE_MAX_UPLOAD_BYTES = 1024 * 1024;
export const FILEBASE_ALLOWED_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export function assertValidFilebaseUpload(input: {
  contentType: string;
  fileSize: number;
  fileName: string;
}) {
  if (!FILEBASE_ALLOWED_CONTENT_TYPES.includes(input.contentType)) {
    throw new Error('Banner upload must be PNG, JPEG, GIF, or WebP.');
  }
  if (!Number.isInteger(input.fileSize) || input.fileSize <= 0 || input.fileSize > FILEBASE_MAX_UPLOAD_BYTES) {
    throw new Error('Banner upload must be 1MB or smaller.');
  }

  return sanitizeFilebaseFileName(input.fileName);
}

export function sanitizeFilebaseFileName(fileName: string) {
  const extension = fileName.includes('.') ? fileName.split('.').pop() : 'bin';
  const safeExtension = (extension || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  return `${crypto.randomUUID()}.${safeExtension}`;
}

export function getFilebasePublicUrl(input: {
  bucket: string;
  key: string;
  publicBaseUrl?: string | null;
}) {
  const baseUrl = input.publicBaseUrl || `https://${input.bucket}.s3.filebase.com`;
  return `${baseUrl.replace(/\/$/, '')}/${input.key.split('/').map(encodeURIComponent).join('/')}`;
}
