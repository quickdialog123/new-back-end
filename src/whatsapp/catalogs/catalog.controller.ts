import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '@quickdialog/auth/types/authenticated-user.type.js';
import { CurrentUser } from '@quickdialog/common/decorators/current-user.decorator.js';
import { Roles } from '@quickdialog/common/decorators/roles.decorator.js';
import { UserRole } from '@quickdialog/generated/prisma/client.js';
import { SWAGGER_TAGS } from '@quickdialog/swagger/swagger.tags.js';
import { CatalogService } from './catalog.service.js';
import {
  connectCatalogSchema,
  createCatalogSchema,
  updateCatalogSettingsSchema,
  type ConnectCatalogDto,
  type CreateCatalogDto,
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

  @Get('available')
  @Roles(UserRole.OWNER)
  getAvailableCatalogs(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.getAvailableCatalogs(user.hotelId!);
  }

  @Post()
  @Roles(UserRole.OWNER)
  createCatalog(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: createCatalogSchema }) input: CreateCatalogDto,
  ) {
    return this.catalogService.createCatalog(user.hotelId!, input);
  }

  @Post('connect')
  @Roles(UserRole.OWNER)
  connectCatalog(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: connectCatalogSchema }) input: ConnectCatalogDto,
  ) {
    return this.catalogService.connectCatalog(user.hotelId!, input);
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
