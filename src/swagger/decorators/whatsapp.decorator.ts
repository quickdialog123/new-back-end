import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import {
  completeEmbeddedSignupRequestSwaggerSchema,
  registerPhoneNumberSwaggerSchema,
  requestPhoneVerificationCodeSwaggerSchema,
  verifyPhoneNumberCodeSwaggerSchema,
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

export function ApiRequestWhatsAppVerificationCodeDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({
      summary: 'Request a WhatsApp phone ownership verification code',
    }),
    ApiBody({ schema: requestPhoneVerificationCodeSwaggerSchema }),
    ApiResponse({
      status: HttpStatus.CREATED,
      schema: whatsappStatusSwaggerSchema,
    }),
    ApiErrorResponse(
      HttpStatus.BAD_REQUEST,
      'Phone is not awaiting verification',
    ),
    ApiErrorResponse(HttpStatus.NOT_FOUND, 'WhatsApp connection not found'),
    ApiErrorResponse(
      HttpStatus.BAD_GATEWAY,
      'Meta WhatsApp API request failed',
    ),
  );
}

export function ApiVerifyWhatsAppPhoneDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({ summary: 'Verify ownership of the WhatsApp phone number' }),
    ApiBody({ schema: verifyPhoneNumberCodeSwaggerSchema }),
    ApiResponse({
      status: HttpStatus.CREATED,
      schema: whatsappStatusSwaggerSchema,
    }),
    ApiErrorResponse(
      HttpStatus.BAD_REQUEST,
      'Verification code is invalid or not expected',
    ),
    ApiErrorResponse(HttpStatus.NOT_FOUND, 'WhatsApp connection not found'),
    ApiErrorResponse(
      HttpStatus.BAD_GATEWAY,
      'Meta WhatsApp API request failed',
    ),
  );
}

export function ApiRegisterWhatsAppPhoneDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({
      summary: 'Register a verified phone number with WhatsApp Cloud API',
    }),
    ApiBody({ schema: registerPhoneNumberSwaggerSchema }),
    ApiResponse({
      status: HttpStatus.CREATED,
      schema: whatsappStatusSwaggerSchema,
    }),
    ApiErrorResponse(
      HttpStatus.BAD_REQUEST,
      'Phone has not completed ownership verification',
    ),
    ApiErrorResponse(HttpStatus.NOT_FOUND, 'WhatsApp connection not found'),
    ApiErrorResponse(
      HttpStatus.BAD_GATEWAY,
      'Meta WhatsApp API request failed',
    ),
  );
}
