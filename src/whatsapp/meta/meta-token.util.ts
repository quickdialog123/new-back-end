import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

export function encryptMetaToken(token: string, key: string): string {
  const encryptionKey = Buffer.from(key, 'base64');

  const iv = randomBytes(12);

  const cipher = createCipheriv(ALGORITHM, encryptionKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join('.');
}

export function decryptMetaToken(value: string, key: string): string {
  const encryptionKey = Buffer.from(key, 'base64');

  const [iv, tag, encrypted] = value.split('.');

  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey,
    Buffer.from(iv, 'base64'),
  );

  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
