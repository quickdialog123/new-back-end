import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function ApiCreateGuestDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a guest for the authenticated user’s hotel',
    }),
    ApiResponse({ status: HttpStatus.CREATED, description: 'Guest created' }),
  );
}

export function ApiBulkCreateGuestsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Bulk create guests for the authenticated user’s hotel',
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Guests created; returns the count',
    }),
  );
}

export function ApiListGuestsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List guests for the authenticated user’s hotel',
    }),
    ApiResponse({ status: HttpStatus.OK, description: 'Guests returned' }),
  );
}

export function ApiGetGuestDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a guest' }),
    ApiResponse({ status: HttpStatus.OK, description: 'Guest returned' }),
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
    ApiResponse({ status: HttpStatus.OK, description: 'Guest updated' }),
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
