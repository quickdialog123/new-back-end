import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@quickdialog/common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '@quickdialog/auth/types/authenticated-user.type.js';
import {
  completeEmbeddedSignupSchema,
  type CompleteEmbeddedSignupDto,
} from './schemas/complete-embedded-signup.schema.js';
import { EmbeddedSignupService } from './embedded-signup.service.js';
import { Roles } from '@quickdialog/common/decorators/roles.decorator.js';
import { UserRole } from '@quickdialog/generated/prisma/client.js';
import { ApiCompleteEmbeddedSignupDocs } from '@quickdialog/swagger/decorators/whatsapp.decorator.js';
import { SWAGGER_TAGS } from '@quickdialog/swagger/swagger.tags.js';

@ApiTags(SWAGGER_TAGS.WHATSAPP.EMBEDDED_SIGNUP.ROOT)
@Controller('whatsapp/embedded-signup')
export class EmbeddedSignupController {
  constructor(private readonly embeddedSignupService: EmbeddedSignupService) {}

  @Post('complete')
  @Roles(UserRole.OWNER)
  @ApiCompleteEmbeddedSignupDocs()
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: completeEmbeddedSignupSchema })
    input: CompleteEmbeddedSignupDto,
  ) {
    if (!user.hotelId) {
      throw new BadRequestException('Authenticated user has no hotel');
    }

    return this.embeddedSignupService.complete(user.hotelId, input);
  }
}
