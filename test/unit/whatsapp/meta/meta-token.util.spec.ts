import { describe, expect, it } from 'vitest';

import {
  decryptMetaToken,
  encryptMetaToken,
} from '@quickdialog/whatsapp/meta/meta-token.util.js';

describe('Meta token encryption', () => {
  const key = Buffer.alloc(32, 7).toString('base64');

  it('encrypts and decrypts tokens without retaining plaintext', () => {
    const token = 'meta-token-with-unicode-hello';
    const encrypted = encryptMetaToken(token, key);

    expect(encrypted).not.toContain(token);
    expect(encrypted.split('.')).toHaveLength(3);
    expect(decryptMetaToken(encrypted, key)).toBe(token);
    expect(encryptMetaToken(token, key)).not.toBe(encrypted);
  });

  it('rejects tampered encrypted tokens', () => {
    const encrypted = encryptMetaToken('meta-token', key);
    const [iv, tag, value] = encrypted.split('.');
    const tamperedTag = `${tag.startsWith('A') ? 'B' : 'A'}${tag.slice(1)}`;

    expect(() =>
      decryptMetaToken(`${iv}.${tamperedTag}.${value}`, key),
    ).toThrow();
  });
});
