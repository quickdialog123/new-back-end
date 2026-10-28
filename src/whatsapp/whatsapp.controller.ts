import { BadRequestException, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@quickdialog/common/decorators/current-user.decorator.js';
import { Roles } from '@quickdialog/common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '@quickdialog/auth/types/authenticated-user.type.js';
import { UserRole } from '@quickdialog/generated/prisma/client.js';
import { SWAGGER_TAGS } from '@quickdialog/swagger/swagger.tags.js';
import { WhatsappService } from './whatsapp.service.js';
import { MetaGraphClient } from './meta/meta-graph.client.js';

@ApiTags(SWAGGER_TAGS.WHATSAPP.ROOT)
@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly meta: MetaGraphClient,
  ) {}

  @Get('status')
  @Roles(UserRole.OWNER)
  getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.whatsappService.getStatus(this.hotelId(user));
  }

  @Post('disconnect')
  @Roles(UserRole.OWNER)
  disconnect(@CurrentUser() user: AuthenticatedUser) {
    return this.whatsappService.disconnect(this.hotelId(user));
  }

  private hotelId(user: AuthenticatedUser): string {
    if (!user.hotelId) {
      throw new BadRequestException('Authenticated user has no hotel');
    }

    return user.hotelId;
  }
}
