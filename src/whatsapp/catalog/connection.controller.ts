import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '@quickdialog/auth/types/authenticated-user.type.js';
import { CurrentUser } from '@quickdialog/common/decorators/current-user.decorator.js';
import { Roles } from '@quickdialog/common/decorators/roles.decorator.js';
import { UserRole } from '@quickdialog/generated/prisma/client.js';
import { SWAGGER_TAGS } from '@quickdialog/swagger/swagger.tags.js';
import {
  ApiAvailableCatalogsDocs,
  ApiCatalogConnectionDocs,
  ApiConnectCatalogDocs,
  ApiDisconnectCatalogDocs,
  ApiUpdateCatalogSettingsDocs,
} from '@quickdialog/swagger/decorators/whatsapp.decorator.js';
import { CatalogConnectionService } from './connection.service.js';
import {
  connectCatalogSchema,
  updateCatalogSettingsSchema,
  type ConnectCatalogDto,
  type UpdateCatalogSettingsDto,
} from './schemas/connection.schema.js';

@ApiTags(SWAGGER_TAGS.WHATSAPP.CATALOGS.ROOT)
@Controller('whatsapp/catalogs')
export class CatalogConnectionController {
  constructor(private readonly catalogService: CatalogConnectionService) {}

  @Post('connect')
  @Roles(UserRole.OWNER)
  @ApiConnectCatalogDocs()
  connectCatalog(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: connectCatalogSchema })
    input: ConnectCatalogDto,
  ) {
    return this.catalogService.connectCatalog(user.hotelId!, input.catalogId);
  }

  @Post('disconnect')
  @Roles(UserRole.OWNER)
  @ApiDisconnectCatalogDocs()
  disconnectCatalog(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.disconnectCatalog(user.hotelId!);
  }

  @Get('connection')
  @Roles(UserRole.OWNER)
  @ApiCatalogConnectionDocs()
  getConnection(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.getConnection(user.hotelId!);
  }

  @Get('available')
  @Roles(UserRole.OWNER)
  @ApiAvailableCatalogsDocs()
  getAvailableCatalogs(@CurrentUser() user: AuthenticatedUser) {
    console.log('Getting available catalogs for hotelId:', user.hotelId);
    return this.catalogService.getAvailableCatalogs(user.hotelId!);
  }

  @Patch('settings')
  @Roles(UserRole.OWNER)
  @ApiUpdateCatalogSettingsDocs()
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: updateCatalogSettingsSchema })
    input: UpdateCatalogSettingsDto,
  ) {
    return this.catalogService.updateSettings(user.hotelId!, input);
  }
}
