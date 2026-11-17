import { Module } from '@nestjs/common';
import { HttpClientModule } from '@nestjs/http-client';
import { EmbeddedSignupController } from './embedded-signup/embedded-signup.controller.js';
import { EmbeddedSignupService } from './embedded-signup/embedded-signup.service.js';
import { MetaGraphClient } from './meta/meta-graph.client.js';
import { WhatsappController } from './whatsapp.controller.js';
import { WhatsappService } from './whatsapp.service.js';
import { WebhookController } from './webhooks/webhook.controller.js';
import { WebhookService } from './webhooks/webhook.service.js';
import { WebhookSignatureGuard } from './webhooks/webhook-signature.guard.js';
import { CatalogProductsController } from './catalog/catalog.controller.js';
import { CatalogProductsService } from './catalog/catalog.service.js';

@Module({
  imports: [
    HttpClientModule.register({
      baseUrl: 'https://graph.facebook.com',
      timeout: '21s',
    }),
  ],
  controllers: [
    WhatsappController,
    EmbeddedSignupController,
    WebhookController,
    CatalogProductsController,
  ],
  providers: [
    MetaGraphClient,
    WhatsappService,
    EmbeddedSignupService,
    WebhookService,
    WebhookSignatureGuard,
    CatalogProductsService,
  ],
  exports: [MetaGraphClient],
})
export class WhatsappModule {}
