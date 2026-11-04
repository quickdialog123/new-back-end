import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@quickdialog/common/decorators/current-user.decorator.js';
import { Roles } from '@quickdialog/common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '@quickdialog/auth/types/authenticated-user.type.js';
import { UserRole } from '@quickdialog/generated/prisma/client.js';
import {
  ApiDisconnectWhatsAppDocs,
  ApiRegisterWhatsAppPhoneDocs,
  ApiWhatsAppStatusDocs,
} from '@quickdialog/swagger/decorators/whatsapp.decorator.js';
import { SWAGGER_TAGS } from '@quickdialog/swagger/swagger.tags.js';
import { WhatsappService } from './whatsapp.service.js';
import {
  registerPhoneNumberSchema,
  type RegisterPhoneNumberDTO,
} from './schemas/whatsapp-verification.schema.js';
import { Public } from '@quickdialog/common/decorators/public.decorator.js';

@ApiTags(SWAGGER_TAGS.WHATSAPP.ROOT)
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('status')
  @Roles(UserRole.OWNER)
  @ApiWhatsAppStatusDocs()
  getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.whatsappService.getStatus(this.hotelId(user));
  }

  @Post('disconnect')
  @Roles(UserRole.OWNER)
  @ApiDisconnectWhatsAppDocs()
  disconnect(@CurrentUser() user: AuthenticatedUser) {
    return this.whatsappService.disconnect(this.hotelId(user));
  }

  @Post('register')
  @Roles(UserRole.OWNER)
  @ApiRegisterWhatsAppPhoneDocs()
  registerPhoneNumber(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: registerPhoneNumberSchema }) input: RegisterPhoneNumberDTO,
  ) {
    return this.whatsappService.registerPhoneNumber(
      this.hotelId(user),
      input.pin,
    );
  }

  private hotelId(user: AuthenticatedUser): string {
    if (!user.hotelId) {
      throw new BadRequestException('Authenticated user has no hotel');
    }

    return user.hotelId;
  }
}
