import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';

import type { MetaWebhookPayload } from './webhook.types.js';

@Injectable()
export class WebhookService {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(WebhookService.name);
  }

  verify(
    mode: string | undefined,
    verifyToken: string | undefined,
    challenge: string | undefined,
  ): string {
    const expectedToken = this.config.getOrThrow<string>(
      'meta.webhook.verifyToken',
    );

    if (mode !== 'subscribe' || verifyToken !== expectedToken || !challenge) {
      throw new ForbiddenException('WhatsApp webhook verification failed');
    }

    return challenge;
  }

  receive(payload: MetaWebhookPayload): void {
    this.logger.info({ payload }, 'WhatsApp webhook received');

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;

        for (const message of value.messages ?? []) {
          this.logger.info(
            {
              wabaId: entry.id,
              phoneNumberId: value.metadata?.phone_number_id,
              metaMessageId: message.id,
              from: message.from,
              type: message.type,
              text: message.text?.body,
            },
            'WhatsApp inbound message received',
          );
        }

        for (const status of value.statuses ?? []) {
          this.logger.info(
            {
              wabaId: entry.id,
              phoneNumberId: value.metadata?.phone_number_id,
              metaMessageId: status.id,
              status: status.status,
              recipientId: status.recipient_id,
              errors: status.errors,
            },
            'WhatsApp message status received',
          );
        }
      }
    }
  }
}
