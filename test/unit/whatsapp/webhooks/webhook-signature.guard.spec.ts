import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import { PinoLogger } from 'nestjs-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WebhookSignatureGuard } from '@quickdialog/whatsapp/webhooks/webhook-signature.guard.js';

describe('WebhookSignatureGuard', () => {
  let guard: WebhookSignatureGuard;
  const config = { getOrThrow: vi.fn(() => 'meta-app-secret') };
  const logger = { setContext: vi.fn(), warn: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        WebhookSignatureGuard,
        { provide: ConfigService, useValue: config },
        { provide: PinoLogger, useValue: logger },
      ],
    }).compile();
    guard = moduleRef.get(WebhookSignatureGuard);
  });

  function context(signature: unknown, rawBody: Buffer | undefined) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-hub-signature-256': signature },
          rawBody,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('accepts a valid Meta HMAC signature', () => {
    const rawBody = Buffer.from('{"object":"whatsapp_business_account"}');
    const digest = createHmac('sha256', 'meta-app-secret')
      .update(rawBody)
      .digest('hex');

    expect(guard.canActivate(context(`sha256=${digest}`, rawBody))).toBe(true);
    expect(config.getOrThrow).toHaveBeenCalledWith('meta.appSecret');
  });

  it.each([
    ['missing signature', undefined, Buffer.from('{}')],
    ['missing body', 'sha256=abcd', undefined],
    ['invalid prefix', 'md5=abcd', Buffer.from('{}')],
    ['invalid digest', 'sha256=not-a-digest', Buffer.from('{}')],
    ['mismatched digest', `sha256=${'0'.repeat(64)}`, Buffer.from('{}')],
  ])('rejects a %s', (_description, signature, rawBody) => {
    expect(() => guard.canActivate(context(signature, rawBody))).toThrow(
      UnauthorizedException,
    );
    expect(logger.warn).toHaveBeenCalled();
  });
});
