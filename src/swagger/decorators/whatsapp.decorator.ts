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
