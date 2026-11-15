import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '@quickdialog/auth/types/authenticated-user.type.js';
import { CurrentUser } from '@quickdialog/common/decorators/current-user.decorator.js';
import { Roles } from '@quickdialog/common/decorators/roles.decorator.js';
import { UserRole } from '@quickdialog/generated/prisma/client.js';
import { SWAGGER_TAGS } from '@quickdialog/swagger/swagger.tags.js';
import { CatalogService } from './catalog.service.js';
import {
  updateCatalogSettingsSchema,
  type UpdateCatalogSettingsDto,
} from './schemas/catalog.schema.js';

@ApiTags(SWAGGER_TAGS.WHATSAPP.EMBEDDED_SIGNUP.ROOT)
@Controller('whatsapp/catalogs')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('connection')
  @Roles(UserRole.OWNER)
  getConnection(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.getConnection(user.hotelId!);
  }

  @Patch('settings')
  @Roles(UserRole.OWNER)
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: updateCatalogSettingsSchema })
    input: UpdateCatalogSettingsDto,
  ) {
    return this.catalogService.updateSettings(user.hotelId!, input);
  }
}
