import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MetaGraphClient } from './meta/meta-graph.client.js';
import { ApiTags } from '@nestjs/swagger';
import { SWAGGER_TAGS } from '@quickdialog/swagger/swagger.tags.js';

@ApiTags(SWAGGER_TAGS.WHATSAPP.ROOT)
@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly metaGraphClient: MetaGraphClient,
    private readonly config: ConfigService,
  ) {}
}
