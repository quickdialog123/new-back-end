import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@quickdialog/common/decorators/current-user.decorator.js';
import { Roles } from '@quickdialog/common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '@quickdialog/auth/types/authenticated-user.type.js';
import { UserRole } from '@quickdialog/generated/prisma/client.js';
import {
  completeEmbeddedSignupSchema,
  type CompleteEmbeddedSignupDto,
} from './schemas/complete-embedded-signup.schema.js';
import { EmbeddedSignupService } from './embedded-signup.service.js';
import { Public } from '@quickdialog/common/decorators/public.decorator.js';
import { SkipOriginCheck } from '@quickdialog/common/decorators/skip-origin-check.decorator.js';

@ApiTags('WhatsApp')
@Controller('whatsapp/embedded-signup')
export class EmbeddedSignupController {
  constructor(private readonly embeddedSignupService: EmbeddedSignupService) {}

  //@Roles(UserRole.OWNER)
  @Post('complete')
  @Public()
  @SkipOriginCheck()
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: completeEmbeddedSignupSchema })
    input: CompleteEmbeddedSignupDto,
  ) {
    // if (!user.hotelId) {
    //   throw new Error('Authenticated user has no hotel');
    // }
    const _user: any = {
      hotelId: '758a41c4-07f8-404f-84f8-65740fe51722',
    };

    return this.embeddedSignupService.complete(_user.hotelId, input);
  }
}
