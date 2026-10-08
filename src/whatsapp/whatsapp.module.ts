import { Module } from '@nestjs/common';
import { HttpClientModule } from '@nestjs/http-client';

import { MetaGraphClient } from './meta/meta-graph.client.js';
import { WhatsappController } from './whatsapp.controller.js';
import { WebhookController } from './webhooks/webhook.controller.js';
import { WebhookService } from './webhooks/webhook.service.js';
import { WebhookSignatureGuard } from './webhooks/webhook-signature.guard.js';

@Module({
  imports: [
    HttpClientModule.register({
      baseUrl: 'https://graph.facebook.com',
      timeout: '10s',
    }),
  ],

  controllers: [WhatsappController, WebhookController],
  providers: [MetaGraphClient, WebhookService, WebhookSignatureGuard],
  exports: [MetaGraphClient],
})
export class WhatsappModule {}
