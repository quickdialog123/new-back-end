import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

import {
  templateInputExample,
  templateListResponseExample,
  templateMediaUploadResponseExample,
  templateResponseExample,
} from '../examples/templates.examples.js';
import {
  templateListResponseSwaggerSchema,
  templateMediaResponseSwaggerSchema,
  templateRequestSwaggerSchema,
  templateResponseSwaggerSchema,
} from '../schemas/templates.swagger.js';
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

const templateIdParam = () =>
  ApiParam({ name: 'id', example: '123456789012345' });

export function ApiListTemplatesDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({ summary: 'List WhatsApp templates for the hotel WABA' }),
    ApiQuery({ name: 'after', required: false, example: 'next-page-cursor' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Template page returned',
      schema: {
        ...templateListResponseSwaggerSchema,
        example: templateListResponseExample,
      },
    }),
  );
}

export function ApiGetTemplateDocs() {
  return applyDecorators(
    protectedResponses(),
    templateIdParam(),
    ApiOperation({
      summary: 'Get a WhatsApp template owned by the hotel WABA',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Template returned',
      schema: {
        ...templateResponseSwaggerSchema,
        example: templateResponseExample,
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Template not found',
    }),
  );
}

export function ApiCreateTemplateDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({ summary: 'Submit a WhatsApp template for Meta review' }),
    ApiBody({
      schema: {
        ...templateRequestSwaggerSchema,
        example: templateInputExample,
      } as never,
      examples: {
        template: { summary: 'Submit a template', value: templateInputExample },
      },
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Template submitted',
      schema: {
        ...templateResponseSwaggerSchema,
        example: templateResponseExample,
      },
    }),
  );
}

export function ApiUploadTemplateMediaDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({ summary: 'Upload media for a WhatsApp template header' }),
    ApiConsumes('image/jpeg', 'image/png', 'video/mp4'),
    ApiHeader({
      name: 'x-file-name',
      required: true,
      example: 'header-image.png',
    }),
    ApiBody({
      description: 'Raw image or video bytes (maximum 15 MB)',
      schema: { type: 'string', format: 'binary' },
      examples: {
        image: { summary: 'PNG image bytes', value: '<binary image bytes>' },
      },
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description:
        'Media uploaded; use the returned handle in a template header',
      schema: {
        ...templateMediaResponseSwaggerSchema,
        example: templateMediaUploadResponseExample,
      },
    }),
  );
}

export function ApiUpdateTemplateDocs() {
  return applyDecorators(
    protectedResponses(),
    templateIdParam(),
    ApiOperation({
      summary: 'Update a WhatsApp template owned by the hotel WABA',
    }),
    ApiBody({
      schema: {
        ...templateRequestSwaggerSchema,
        example: templateInputExample,
      } as never,
      examples: {
        template: {
          summary: 'Update template components',
          value: templateInputExample,
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Template updated',
      schema: {
        ...templateResponseSwaggerSchema,
        example: templateResponseExample,
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Template not found',
    }),
  );
}

export function ApiDeleteTemplateDocs() {
  return applyDecorators(
    protectedResponses(),
    templateIdParam(),
    ApiOperation({ summary: 'Delete a WhatsApp template from the hotel WABA' }),
    ApiResponse({
      status: HttpStatus.NO_CONTENT,
      description: 'Template deleted; no response body',
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Template not found',
    }),
  );
}
