import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import {
  availableCatalogsSwaggerSchema,
  catalogConnectionSwaggerSchema,
  completeEmbeddedSignupRequestSwaggerSchema,
  connectCatalogRequestSwaggerSchema,
  registerPhoneNumberSwaggerSchema,
  updateCatalogSettingsRequestSwaggerSchema,
  whatsappStatusSwaggerSchema,
} from '../schemas/whatsapp.swagger.js';
import {
  ApiErrorResponse,
  ApiGlobalGuardResponses,
} from './common-response.decorator.js';

const protectedResponses = () =>
  applyDecorators(
    ApiBearerAuth('access-token'),
    ApiErrorResponse(
      HttpStatus.UNAUTHORIZED,
      'Missing, expired, or invalid access token',
    ),
    ApiErrorResponse(HttpStatus.FORBIDDEN, 'Insufficient permissions'),
    ApiGlobalGuardResponses(),
  );

export function ApiWhatsAppStatusDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({ summary: 'Get WhatsApp connection status' }),
    ApiResponse({ status: HttpStatus.OK, schema: whatsappStatusSwaggerSchema }),
    ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Hotel context is required'),
  );
}

export function ApiDisconnectWhatsAppDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({ summary: 'Disconnect WhatsApp' }),
    ApiResponse({
      status: HttpStatus.CREATED,
      schema: whatsappStatusSwaggerSchema,
    }),
    ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Hotel context is required'),
  );
}

export function ApiCompleteEmbeddedSignupDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({ summary: 'Complete WhatsApp Embedded Signup' }),
    ApiBody({ schema: completeEmbeddedSignupRequestSwaggerSchema }),
    ApiResponse({
      status: HttpStatus.CREATED,
      schema: whatsappStatusSwaggerSchema,
    }),
    ApiErrorResponse(
      HttpStatus.BAD_REQUEST,
      'WhatsApp connection could not be completed',
    ),
    ApiErrorResponse(HttpStatus.NOT_FOUND, 'Hotel not found'),
  );
}

export function ApiRegisterWhatsAppPhoneDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({
      summary: 'Register an unverified phone number with WhatsApp Cloud API',
    }),
    ApiBody({ schema: registerPhoneNumberSwaggerSchema }),
    ApiResponse({
      status: HttpStatus.CREATED,
      schema: whatsappStatusSwaggerSchema,
    }),
    ApiErrorResponse(
      HttpStatus.BAD_REQUEST,
      'WhatsApp connection is not awaiting PIN registration',
    ),
    ApiErrorResponse(HttpStatus.NOT_FOUND, 'WhatsApp connection not found'),
    ApiErrorResponse(
      HttpStatus.BAD_GATEWAY,
      'Meta WhatsApp API request failed',
    ),
  );
}

export function ApiConnectCatalogDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({ summary: 'Connect a product catalog to WhatsApp' }),
    ApiBody({ schema: connectCatalogRequestSwaggerSchema }),
    ApiResponse({
      status: HttpStatus.CREATED,
      schema: catalogConnectionSwaggerSchema,
    }),
    ApiErrorResponse(HttpStatus.NOT_FOUND, 'WhatsApp account is not connected'),
  );
}

export function ApiDisconnectCatalogDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({ summary: 'Disconnect the WhatsApp product catalog' }),
    ApiResponse({
      status: HttpStatus.CREATED,
      schema: catalogConnectionSwaggerSchema,
    }),
    ApiErrorResponse(HttpStatus.NOT_FOUND, 'WhatsApp account is not connected'),
  );
}

export function ApiCatalogConnectionDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({ summary: 'Get WhatsApp catalog connection' }),
    ApiResponse({
      status: HttpStatus.OK,
      schema: catalogConnectionSwaggerSchema,
    }),
    ApiErrorResponse(HttpStatus.NOT_FOUND, 'WhatsApp account is not connected'),
  );
}

export function ApiAvailableCatalogsDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({ summary: 'List available product catalogs' }),
    ApiResponse({
      status: HttpStatus.OK,
      schema: availableCatalogsSwaggerSchema,
    }),
    ApiErrorResponse(HttpStatus.NOT_FOUND, 'WhatsApp account is not connected'),
  );
}

export function ApiUpdateCatalogSettingsDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({ summary: 'Update WhatsApp catalog settings' }),
    ApiBody({ schema: updateCatalogSettingsRequestSwaggerSchema }),
    ApiResponse({
      status: HttpStatus.OK,
      schema: catalogConnectionSwaggerSchema,
    }),
    ApiErrorResponse(HttpStatus.BAD_REQUEST, 'No catalog is connected'),
    ApiErrorResponse(HttpStatus.NOT_FOUND, 'WhatsApp account is not connected'),
  );
}

const productFields = {
  name: { type: 'string', maxLength: 200 },
  description: { type: 'string', maxLength: 5000 },
  productUrl: { type: 'string', format: 'uri' },
  imageUrl: { type: 'string', format: 'uri' },
  price: { type: 'string', example: '12.50' },
  currency: { type: 'string', pattern: '^[A-Z]{3}$', example: 'USD' },
  availability: {
    type: 'string',
    enum: ['in stock', 'out of stock', 'available for order', 'discontinued'],
  },
  brand: { type: 'string', maxLength: 100 },
  condition: { type: 'string', enum: ['new', 'refurbished', 'used'] },
};

const protectedCatalogRoute = () =>
  applyDecorators(
    ApiBearerAuth('access-token'),
    ApiErrorResponse(
      HttpStatus.UNAUTHORIZED,
      'Missing or invalid access token',
    ),
    ApiErrorResponse(HttpStatus.FORBIDDEN, 'Hotel owner role required'),
    ApiGlobalGuardResponses(),
  );

export function ApiListCatalogsDocs() {
  return applyDecorators(
    protectedCatalogRoute(),
    ApiOperation({ summary: 'List Meta catalogs accessible to this hotel' }),
    ApiResponse({ status: HttpStatus.OK, description: 'Accessible catalogs' }),
    ApiErrorResponse(HttpStatus.BAD_GATEWAY, 'Meta catalog lookup failed'),
  );
}

export function ApiListProductsDocs() {
  return applyDecorators(
    protectedCatalogRoute(),
    ApiOperation({ summary: 'List products in an accessible Meta catalog' }),
    ApiResponse({ status: HttpStatus.OK, description: 'Meta product page' }),
    ApiErrorResponse(HttpStatus.NOT_FOUND, 'Catalog not found for this hotel'),
  );
}

export function ApiCreateProductDocs() {
  return applyDecorators(
    protectedCatalogRoute(),
    ApiOperation({ summary: 'Create a product in a Meta catalog' }),
    ApiBody({
      schema: {
        type: 'object',
        required: Object.keys(productFields),
        properties: productFields,
      },
    }),
    ApiResponse({
      status: HttpStatus.ACCEPTED,
      description: 'Meta accepted the product batch operation',
    }),
    ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Meta rejected product data'),
    ApiErrorResponse(HttpStatus.NOT_FOUND, 'Catalog not found for this hotel'),
    ApiErrorResponse(HttpStatus.BAD_GATEWAY, 'Meta product request failed'),
  );
}

export function ApiUpdateProductDocs() {
  return applyDecorators(
    protectedCatalogRoute(),
    ApiOperation({ summary: 'Update a product in a Meta catalog' }),
    ApiBody({
      schema: {
        type: 'object',
        minProperties: 1,
        properties: productFields,
      },
    }),
    ApiResponse({
      status: HttpStatus.ACCEPTED,
      description: 'Meta accepted the product batch operation',
    }),
    ApiErrorResponse(HttpStatus.NOT_FOUND, 'Catalog or product not found'),
  );
}

export function ApiDeleteProductDocs() {
  return applyDecorators(
    protectedCatalogRoute(),
    ApiOperation({ summary: 'Delete a product from a Meta catalog' }),
    ApiResponse({
      status: HttpStatus.ACCEPTED,
      description: 'Meta accepted the product batch operation',
    }),
    ApiErrorResponse(HttpStatus.NOT_FOUND, 'Catalog not found for this hotel'),
  );
}

export function ApiCatalogOperationStatusDocs() {
  return applyDecorators(
    protectedCatalogRoute(),
    ApiOperation({ summary: 'Get Meta catalog batch processing status' }),
    ApiResponse({ status: HttpStatus.OK, description: 'Operation status' }),
    ApiErrorResponse(HttpStatus.NOT_FOUND, 'Catalog not found for this hotel'),
  );
}
