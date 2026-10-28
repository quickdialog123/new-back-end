import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import {
  completeEmbeddedSignupRequestSwaggerSchema,
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
