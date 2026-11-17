import {
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

import type { AuthenticatedUser } from '@quickdialog/auth/types/authenticated-user.type.js';
import { CurrentUser } from '@quickdialog/common/decorators/current-user.decorator.js';
import { Roles } from '@quickdialog/common/decorators/roles.decorator.js';
import { UserRole } from '@quickdialog/generated/prisma/client.js';

import { SWAGGER_TAGS } from '@quickdialog/swagger/swagger.tags.js';

import {
  ApiAvailableCatalogsDocs,
  ApiCatalogConnectionDocs,
  ApiCatalogOperationStatusDocs,
  ApiConnectCatalogDocs,
  ApiCreateProductDocs,
  ApiDeleteProductDocs,
  ApiDisconnectCatalogDocs,
  ApiListCatalogsDocs,
  ApiListProductsDocs,
  ApiUpdateCatalogSettingsDocs,
  ApiUpdateProductDocs,
} from '@quickdialog/swagger/decorators/whatsapp.decorator.js';

import { CatalogService } from './catalog.service.js';

import {
  batchHandleParamSchema,
  catalogIdParamSchema,
  createProductSchema,
  productIdParamSchema,
  productListQuerySchema,
  updateProductSchema,
  type BatchHandleParamDto,
  type CatalogIdParamDto,
  type CreateProductDto,
  type ProductIdParamDto,
  type ProductListQueryDto,
  type UpdateProductDto,
} from './schemas/product.schema.js';
import {
  connectCatalogSchema,
  updateCatalogSettingsSchema,
  type ConnectCatalogDto,
  type UpdateCatalogSettingsDto,
} from './schemas/catalog.schema.js';

@ApiTags(SWAGGER_TAGS.WHATSAPP.CATALOGS.ROOT)
@Roles(UserRole.OWNER)
@Controller('whatsapp/catalogs')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post('connect')
  @ApiConnectCatalogDocs()
  connectCatalog(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: connectCatalogSchema }) input: ConnectCatalogDto,
  ) {
    return this.catalogService.connectCatalog(user.hotelId!, input.catalogId);
  }

  @Post('disconnect')
  @ApiDisconnectCatalogDocs()
  disconnectCatalog(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.disconnectCatalog(user.hotelId!);
  }

  @Get('connection')
  @ApiCatalogConnectionDocs()
  getConnection(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.getConnection(user.hotelId!);
  }

  @Get('available')
  @ApiAvailableCatalogsDocs()
  getAvailableCatalogs(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.getAvailableCatalogs(user.hotelId!);
  }

  @Patch('settings')
  @ApiUpdateCatalogSettingsDocs()
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: updateCatalogSettingsSchema })
    input: UpdateCatalogSettingsDto,
  ) {
    return this.catalogService.updateSettings(user.hotelId!, input);
  }

  @Get()
  @ApiListCatalogsDocs()
  listCatalogs(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.listCatalogs(user.hotelId!);
  }

  @Get(':catalogId/products')
  @ApiListProductsDocs()
  listProducts(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: catalogIdParamSchema })
    params: CatalogIdParamDto,
    @Query({ schema: productListQuerySchema })
    query: ProductListQueryDto,
  ) {
    return this.catalogService.listProducts(
      user.hotelId!,
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
    params: CatalogIdParamDto,
    @Body({ schema: createProductSchema })
    input: CreateProductDto,
  ) {
    return this.catalogService.createProduct(
      user.hotelId!,
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
    params: ProductIdParamDto,
    @Body({ schema: updateProductSchema })
    input: UpdateProductDto,
  ) {
    return this.catalogService.updateProduct(
      user.hotelId!,
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
    params: ProductIdParamDto,
  ) {
    return this.catalogService.deleteProduct(
      user.hotelId!,
      params.catalogId,
      params.productId,
    );
  }

  @Get(':catalogId/operations/:handle')
  @ApiCatalogOperationStatusDocs()
  getOperationStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: batchHandleParamSchema })
    params: BatchHandleParamDto,
  ) {
    return this.catalogService.getBatchStatus(
      user.hotelId!,
      params.catalogId,
      params.handle,
    );
  }
}
