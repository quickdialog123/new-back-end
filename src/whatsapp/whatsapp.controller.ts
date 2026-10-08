import { Body, Controller, NotFoundException, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Public } from '@quickdialog/common/decorators/public.decorator.js';
import { MetaGraphClient } from './meta/meta-graph.client.js';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { SWAGGER_TAGS } from '@quickdialog/swagger/swagger.tags.js';
import { SkipOriginCheck } from '@quickdialog/common/decorators/skip-origin-check.decorator.js';

export const sendDevMessageSchema = z.object({
  to: z.string().min(8),
  message: z.string().min(1).max(4096),
});

export type SendDevMessageDto = z.infer<typeof sendDevMessageSchema>;

@ApiTags(SWAGGER_TAGS.WHATSAPP.ROOT)
@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly metaGraphClient: MetaGraphClient,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @SkipOriginCheck()
  @Post('send')
  async send(
    @Body({ schema: sendDevMessageSchema })
    input: SendDevMessageDto,
  ) {
    const phoneNumberId = this.config.getOrThrow<string>(
      'meta.test.phoneNumberId',
    );

    const accessToken = this.config.getOrThrow<string>('meta.test.accessToken');

    return this.metaGraphClient.sendText(
      phoneNumberId,
      accessToken,
      input.to,
      input.message,
    );
  }
}
