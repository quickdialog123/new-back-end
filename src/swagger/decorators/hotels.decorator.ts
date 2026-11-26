import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

import { hotelExample } from '../examples/hotels.examples.js';
import {
  createHotelRequestSwaggerSchema,
  createdHotelSwaggerSchema,
  hotelSwaggerSchema,
  updateHotelRequestSwaggerSchema,
} from '../schemas/hotels.swagger.js';
import {
  ApiErrorResponse,
  ApiGlobalGuardResponses,
} from './common-response.decorator.js';

const hotelIdParam = ApiParam({
  name: 'id',
  format: 'uuid',
  example: hotelExample.id,
});
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

export function ApiCreateHotelDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({ summary: 'Create a hotel and its initial owner' }),
    ApiBody({ schema: createHotelRequestSwaggerSchema }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Hotel created',
      schema: {
        ...createdHotelSwaggerSchema,
        example: {
          ...hotelExample,
          owner: {
            id: '4e3ee6a0-eec9-47c8-9fe3-e92afe8a2b1b',
            email: 'owner@example.com',
            fullName: 'Hotel Owner',
            role: 'OWNER',
          },
        },
      },
    }),
    ApiErrorResponse(
      HttpStatus.CONFLICT,
      'A record with this value already exists',
    ),
    ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Request validation failed'),
  );
}

export function ApiListHotelsDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({ summary: 'List hotels' }),
    ApiResponse({
      status: HttpStatus.OK,
      schema: {
        type: 'array',
        items: hotelSwaggerSchema,
        example: [hotelExample],
      },
    }),
  );
}

export function ApiGetHotelDocs() {
  return applyDecorators(
    protectedResponses(),
    hotelIdParam,
    ApiOperation({ summary: 'Get a hotel' }),
    ApiResponse({
      status: HttpStatus.OK,
      schema: { ...hotelSwaggerSchema, example: hotelExample },
    }),
    ApiErrorResponse(HttpStatus.NOT_FOUND, 'Hotel not found'),
  );
}

export function ApiUpdateHotelDocs() {
  return applyDecorators(
    protectedResponses(),
    hotelIdParam,
    ApiOperation({ summary: 'Update a hotel' }),
    ApiBody({ schema: updateHotelRequestSwaggerSchema }),
    ApiResponse({
      status: HttpStatus.OK,
      schema: { ...hotelSwaggerSchema, example: hotelExample },
    }),
    ApiErrorResponse(HttpStatus.NOT_FOUND, 'Record not found'),
    ApiErrorResponse(
      HttpStatus.CONFLICT,
      'A record with this value already exists',
    ),
  );
}

export function ApiDeactivateHotelDocs() {
  return applyDecorators(
    protectedResponses(),
    hotelIdParam,
    ApiOperation({ summary: 'Deactivate a hotel' }),
    ApiResponse({
      status: HttpStatus.OK,
      schema: {
        ...hotelSwaggerSchema,
        example: { ...hotelExample, active: false },
      },
    }),
    ApiErrorResponse(HttpStatus.NOT_FOUND, 'Record not found'),
  );
}
