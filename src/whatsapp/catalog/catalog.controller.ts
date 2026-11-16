import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

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

import {
  ApiCatalogOperationStatusDocs,
  ApiCreateProductDocs,
  ApiDeleteProductDocs,
  ApiListCatalogsDocs,
  ApiListProductsDocs,
  ApiUpdateProductDocs,
} from '@quickdialog/swagger/decorators/catalog.decorator.js';

import { CatalogService } from './catalog.service.js';

import {
  connectCatalogSchema,
  updateCatalogSettingsSchema,
  type ConnectCatalogDto,
  type UpdateCatalogSettingsDto,
} from './schemas/catalog.schema.js';

import {
  batchHandleParamSchema,
  catalogIdParamSchema,
  createProductSchema,
  productIdParamSchema,
  updateProductSchema,
  type CreateProductDto,
  type UpdateProductDto,
} from './product.schema.js';

const productListQuerySchema = z.object({
  after: z.string().optional(),
});

@ApiTags(SWAGGER_TAGS.WHATSAPP.CATALOGS.ROOT)
@Roles(UserRole.OWNER)
@Controller('whatsapp/catalogs')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post('connect')
  @ApiConnectCatalogDocs()
  connectCatalog(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: connectCatalogSchema })
    input: ConnectCatalogDto,
  ) {
    return this.catalogService.connectCatalog(
      this.hotelId(user),
      input.catalogId,
    );
  }

  @Post('disconnect')
  @ApiDisconnectCatalogDocs()
  disconnectCatalog(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.disconnectCatalog(this.hotelId(user));
  }

  @Get('connection')
  @ApiCatalogConnectionDocs()
  getConnection(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.getConnection(this.hotelId(user));
  }

  @Get('available')
  @ApiAvailableCatalogsDocs()
  getAvailableCatalogs(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.getAvailableCatalogs(this.hotelId(user));
  }

  @Patch('settings')
  @ApiUpdateCatalogSettingsDocs()
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: updateCatalogSettingsSchema })
    input: UpdateCatalogSettingsDto,
  ) {
    return this.catalogService.updateSettings(this.hotelId(user), input);
  }

  @Get()
  @ApiListCatalogsDocs()
  listCatalogs(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.listCatalogs(this.hotelId(user));
  }

  @Get(':catalogId/products')
  @ApiListProductsDocs()
  listProducts(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: catalogIdParamSchema })
    params: z.infer<typeof catalogIdParamSchema>,
    @Query({ schema: productListQuerySchema })
    query: z.infer<typeof productListQuerySchema>,
  ) {
    return this.catalogService.listProducts(
      this.hotelId(user),
      params.catalogId,
      query.after,
    );
  }

  @Post(':catalogId/products')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiCreateProductDocs()
  createProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: catalogIdParamSchema })
    params: z.infer<typeof catalogIdParamSchema>,
    @Body({ schema: createProductSchema })
    input: CreateProductDto,
  ) {
    return this.catalogService.createProduct(
      this.hotelId(user),
      params.catalogId,
      input,
    );
  }

  @Patch(':catalogId/products/:productId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiUpdateProductDocs()
  updateProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: productIdParamSchema })
    params: z.infer<typeof productIdParamSchema>,
    @Body({ schema: updateProductSchema })
    input: UpdateProductDto,
  ) {
    return this.catalogService.updateProduct(
      this.hotelId(user),
      params.catalogId,
      params.productId,
      input,
    );
  }

  @Delete(':catalogId/products/:productId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiDeleteProductDocs()
  deleteProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: productIdParamSchema })
    params: z.infer<typeof productIdParamSchema>,
  ) {
    return this.catalogService.deleteProduct(
      this.hotelId(user),
      params.catalogId,
      params.productId,
    );
  }

  @Get(':catalogId/operations/:handle')
  @ApiCatalogOperationStatusDocs()
  getOperationStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: batchHandleParamSchema })
    params: z.infer<typeof batchHandleParamSchema>,
  ) {
    return this.catalogService.getBatchStatus(
      this.hotelId(user),
      params.catalogId,
      params.handle,
    );
  }

  private hotelId(user: AuthenticatedUser): string {
    if (!user.hotelId) {
      throw new BadRequestException('Authenticated user has no hotel');
    }

    return user.hotelId;
  }
}
