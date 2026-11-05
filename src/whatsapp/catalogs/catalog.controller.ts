import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@quickdialog/common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '@quickdialog/auth/types/authenticated-user.type.js';
import { Roles } from '@quickdialog/common/decorators/roles.decorator.js';
import { UserRole } from '@quickdialog/generated/prisma/client.js';
import { SWAGGER_TAGS } from '@quickdialog/swagger/swagger.tags.js';
import { CatalogService } from './catalog.service.js';
import { Public } from '@quickdialog/common/decorators/public.decorator.js';
import { SkipOriginCheck } from '@quickdialog/common/decorators/skip-origin-check.decorator.js';

@ApiTags(SWAGGER_TAGS.WHATSAPP.EMBEDDED_SIGNUP.ROOT)
@Controller('whatsapp/catalogs')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @Public()
  @SkipOriginCheck()
  //@Roles(UserRole.OWNER)
  getCatalogs(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.getCatalogs(user.hotelId!);
  }

  @Get(':id')
  @Roles(UserRole.OWNER)
  getCatalogById(@CurrentUser() user: AuthenticatedUser) {
    return '';
  }

  @Post()
  @Roles(UserRole.OWNER)
  createCatalog(@CurrentUser() user: AuthenticatedUser) {
    return '';
  }

  @Patch(':id')
  @Roles(UserRole.OWNER)
  updateCatalog(@CurrentUser() user: AuthenticatedUser) {
    return '';
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  deleteCatalog(@CurrentUser() user: AuthenticatedUser) {
    return '';
  }
}
