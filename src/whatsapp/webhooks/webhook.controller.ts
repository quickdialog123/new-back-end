import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Public } from '@quickdialog/common/decorators/public.decorator.js';
import { SkipOriginCheck } from '@quickdialog/common/decorators/skip-origin-check.decorator.js';

import { WebhookService } from './webhook.service.js';
import type { MetaWebhookPayload } from './webhook.types.js';
import { ApiTags } from '@nestjs/swagger';
import { SWAGGER_TAGS } from '@quickdialog/swagger/swagger.tags.js';
import { WebhookSignatureGuard } from './webhook-signature.guard.js';

@Public()
@SkipOriginCheck()
@ApiTags(SWAGGER_TAGS.WHATSAPP.WEBHOOK.ROOT)
@Controller('whatsapp/webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token')
    verifyToken?: string,
    @Query('hub.challenge')
    challenge?: string,
  ): string {
    return this.webhookService.verify(mode, verifyToken, challenge);
  }

  @Post()
  @UseGuards(WebhookSignatureGuard)
  @HttpCode(HttpStatus.OK)
  receive(@Body() payload: MetaWebhookPayload): { received: true } {
    this.webhookService.receive(payload);

    return {
      received: true,
    };
  }
}
