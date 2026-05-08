import { createHash, createDecipheriv, createCipheriv, randomBytes } from 'node:crypto';

const ENCRYPTION_PREFIX = 'enc:v1';

function getEncryptionKey() {
  const material =
    process.env.ESCROW_ENCRYPTION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PRIVY_APP_SECRET || null;

  if (!material) {
    throw new Error('Missing escrow encryption secret.');
  }

  return createHash('sha256').update(material).digest();
}

export function encryptSecret(secret: string) {
  const iv = randomBytes(12);
  const key = getEncryptionKey();
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function decryptSecret(secret: string) {
  if (!secret.startsWith(`${ENCRYPTION_PREFIX}:`)) {
    return secret;
  }

  const payload = secret.slice(`${ENCRYPTION_PREFIX}:`.length);
  const [ivPart, tagPart, encryptedPart] = payload.split(':');
  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error('Escrow secret is malformed.');
  }

  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
