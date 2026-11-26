import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import {
  bulkCreateGuestsRequestSwaggerSchema,
  bulkDeleteGuestsRequestSwaggerSchema,
  createGuestRequestSwaggerSchema,
  guestResponseSwaggerSchema,
  updateGuestRequestSwaggerSchema,
} from '../schemas/guests.swagger.js';
import {
  guestBulkCreateRequestExample,
  guestCountResponseExample,
  guestCreateRequestExample,
  guestResponseExample,
  guestUpdateRequestExample,
} from '../examples/guests.examples.js';
import {
  ApiErrorResponse,
  ApiGlobalGuardResponses,
} from './common-response.decorator.js';

const protectedResponses = () =>
  applyDecorators(
    ApiBearerAuth('access-token'),
    ApiErrorResponse(
      HttpStatus.UNAUTHORIZED,
      'Missing or invalid access token',
    ),
    ApiErrorResponse(HttpStatus.FORBIDDEN, 'Insufficient permissions'),
    ApiGlobalGuardResponses(),
  );

const guestIdParam = ApiParam({
  name: 'id',
  format: 'uuid',
  example: guestResponseExample.id,
});

export function ApiCreateGuestDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({
      summary: 'Create a guest for the authenticated user’s hotel',
    }),
    ApiBody({
      schema: {
        ...createGuestRequestSwaggerSchema,
        example: guestCreateRequestExample,
      },
      examples: {
        guest: { summary: 'Create a guest', value: guestCreateRequestExample },
      },
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Guest created',
      schema: { ...guestResponseSwaggerSchema, example: guestResponseExample },
    }),
  );
}

export function ApiBulkCreateGuestsDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({
      summary: 'Bulk create guests for the authenticated user’s hotel',
    }),
    ApiBody({
      schema: {
        ...bulkCreateGuestsRequestSwaggerSchema,
        example: guestBulkCreateRequestExample,
      },
      examples: {
        guests: {
          summary: 'Create a batch of guests',
          value: guestBulkCreateRequestExample,
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Guests created; returns the count',
      schema: {
        type: 'object',
        required: ['count'],
        properties: { count: { type: 'integer', example: 1 } },
        example: guestCountResponseExample,
      },
    }),
  );
}

export function ApiListGuestsDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({
      summary: 'List guests for the authenticated user’s hotel',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Guests returned',
      schema: {
        type: 'array',
        items: guestResponseSwaggerSchema,
        example: [guestResponseExample],
      },
    }),
  );
}

export function ApiGetGuestDocs() {
  return applyDecorators(
    protectedResponses(),
    guestIdParam,
    ApiOperation({ summary: 'Get a guest' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Guest returned',
      schema: { ...guestResponseSwaggerSchema, example: guestResponseExample },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Guest not found',
    }),
  );
}

export function ApiBulkDeleteGuestsDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiBody({
      schema: {
        ...bulkDeleteGuestsRequestSwaggerSchema,
        example: { ids: [guestResponseExample.id] },
      },
      examples: {
        guests: {
          summary: 'Delete selected guests',
          value: { ids: [guestResponseExample.id] },
        },
      },
    }),
    ApiOperation({
      summary: 'Bulk delete guests from the authenticated user’s hotel',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Matching guests deleted; returns the count',
      schema: {
        type: 'object',
        required: ['count'],
        properties: { count: { type: 'integer' } },
        example: guestCountResponseExample,
      },
    }),
  );
}

export function ApiUpdateGuestDocs() {
  return applyDecorators(
    protectedResponses(),
    guestIdParam,
    ApiOperation({ summary: 'Update a guest' }),
    ApiBody({
      schema: {
        ...updateGuestRequestSwaggerSchema,
        example: guestUpdateRequestExample,
      },
      examples: {
        guest: { summary: 'Update a guest', value: guestUpdateRequestExample },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Guest updated',
      schema: { ...guestResponseSwaggerSchema, example: guestResponseExample },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Guest not found',
    }),
  );
}

export function ApiDeleteGuestDocs() {
  return applyDecorators(
    protectedResponses(),
    guestIdParam,
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
