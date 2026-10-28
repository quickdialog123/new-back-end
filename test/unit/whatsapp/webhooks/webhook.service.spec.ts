import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WebhookService } from '@quickdialog/whatsapp/webhooks/webhook.service.js';

describe('WebhookService', () => {
  let service: WebhookService;
  const config = { getOrThrow: vi.fn(() => 'verify-token') };
  const logger = { setContext: vi.fn(), info: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: ConfigService, useValue: config },
        { provide: PinoLogger, useValue: logger },
      ],
    }).compile();
    service = moduleRef.get(WebhookService);
  });

  it('returns the challenge for a valid verification request', () => {
    expect(service.verify('subscribe', 'verify-token', 'challenge')).toBe(
      'challenge',
    );
  });

  it.each([
    ['invalid mode', 'unsubscribe', 'verify-token', 'challenge'],
    ['invalid token', 'subscribe', 'wrong-token', 'challenge'],
    ['missing challenge', 'subscribe', 'verify-token', undefined],
  ])(
    'rejects %s verification requests',
    (_description, mode, token, challenge) => {
      expect(() => service.verify(mode, token, challenge)).toThrow(
        ForbiddenException,
      );
    },
  );

  it('logs inbound messages and delivery statuses', () => {
    service.receive({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba-id',
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: 'phone-id' },
                messages: [
                  {
                    id: 'message-id',
                    from: 'guest-id',
                    timestamp: '1',
                    type: 'text',
                    text: { body: 'Hello' },
                  },
                ],
                statuses: [
                  {
                    id: 'status-id',
                    status: 'delivered',
                    timestamp: '2',
                    recipient_id: 'guest-id',
                    errors: [{ code: 1 }],
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(logger.info).toHaveBeenCalledTimes(3);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ metaMessageId: 'message-id', text: 'Hello' }),
      'WhatsApp inbound message received',
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        metaMessageId: 'status-id',
        status: 'delivered',
      }),
      'WhatsApp message status received',
    );
  });

  it('accepts webhook payloads without entries', () => {
    service.receive({ object: 'whatsapp_business_account' });

    expect(logger.info).toHaveBeenCalledOnce();
  });
});
