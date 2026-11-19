import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  bulkCreateGuestsRequestSwaggerSchema,
  createGuestRequestSwaggerSchema,
  guestResponseSwaggerSchema,
  updateGuestRequestSwaggerSchema,
} from '../schemas/guests.swagger.js';

export function ApiCreateGuestDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a guest for the authenticated user’s hotel',
    }),
    ApiBody({ schema: createGuestRequestSwaggerSchema }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Guest created',
      schema: guestResponseSwaggerSchema,
    }),
  );
}

export function ApiBulkCreateGuestsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Bulk create guests for the authenticated user’s hotel',
    }),
    ApiBody({ schema: bulkCreateGuestsRequestSwaggerSchema }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Guests created; returns the count',
      schema: {
        type: 'object',
        required: ['count'],
        properties: { count: { type: 'integer', example: 2 } },
      },
    }),
  );
}

export function ApiListGuestsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List guests for the authenticated user’s hotel',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Guests returned',
      schema: { type: 'array', items: guestResponseSwaggerSchema },
    }),
  );
}

export function ApiGetGuestDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a guest' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Guest returned',
      schema: guestResponseSwaggerSchema,
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Guest not found',
    }),
  );
}

export function ApiBulkDeleteGuestsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Bulk delete guests from the authenticated user’s hotel',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Matching guests deleted; returns the count',
    }),
  );
}

export function ApiUpdateGuestDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a guest' }),
    ApiBody({ schema: updateGuestRequestSwaggerSchema }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Guest updated',
      schema: guestResponseSwaggerSchema,
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Guest not found',
    }),
  );
}

export function ApiDeleteGuestDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a guest' }),
    ApiResponse({
      status: HttpStatus.NO_CONTENT,
      description: 'Guest deleted',
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Guest not found',
    }),
  );
}
