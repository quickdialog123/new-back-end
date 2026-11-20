import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WebhookController } from '@quickdialog/whatsapp/webhooks/webhook.controller.js';
import { WebhookSignatureGuard } from '@quickdialog/whatsapp/webhooks/webhook-signature.guard.js';
import { WebhookService } from '@quickdialog/whatsapp/webhooks/webhook.service.js';

describe('WebhookController', () => {
  let controller: WebhookController;
  const webhookService = { verify: vi.fn(), receive: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        { provide: WebhookService, useValue: webhookService },
        WebhookSignatureGuard,
        { provide: ConfigService, useValue: { getOrThrow: vi.fn() } },
        {
          provide: PinoLogger,
          useValue: { setContext: vi.fn(), warn: vi.fn() },
        },
      ],
    }).compile();
    controller = moduleRef.get(WebhookController);
  });

  it('delegates verification challenges', () => {
    webhookService.verify.mockReturnValue('challenge');

    expect(controller.verify('subscribe', 'verify-token', 'challenge')).toBe(
      'challenge',
    );
    expect(webhookService.verify).toHaveBeenCalledWith(
      'subscribe',
      'verify-token',
      'challenge',
    );
  });

  it('acknowledges webhook payloads after delegating them', () => {
    const payload = { object: 'whatsapp_business_account' };

    expect(controller.receive(payload)).toEqual({ received: true });
    expect(webhookService.receive).toHaveBeenCalledWith(payload);
  });
});
