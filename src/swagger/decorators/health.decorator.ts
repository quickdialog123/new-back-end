import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import {
  ApiErrorResponse,
  ApiGlobalGuardResponses,
} from './common-response.decorator.js';
import { healthSwaggerSchema } from '../schemas/health.swagger.js';
import {
  healthyResponseExample,
  unhealthyResponseExample,
} from '../examples/health.examples.js';

export function ApiHealthDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Check service health' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Database connection is healthy',
      schema: { ...healthSwaggerSchema, example: healthyResponseExample },
    }),
    ApiErrorResponse(
      HttpStatus.SERVICE_UNAVAILABLE,
      'Database connection is unavailable',
      unhealthyResponseExample,
    ),
    ApiGlobalGuardResponses(),
  );
}
