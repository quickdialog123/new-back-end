import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import {
  ApiErrorResponse,
  ApiGlobalGuardResponses,
} from './common-response.decorator.js';
import { healthSwaggerSchema } from '../schemas/health.swagger.js';

const unhealthyHealthExample = {
  statusCode: 503,
  code: 'SERVICE_UNAVAILABLE',
  message: 'Service unavailable',
  path: '/api/health',
  requestId: '17982e36-0e3d-4118-abd7-622e9f573ebd',
  timestamp: '2026-10-02T14:01:53.098Z',
  details: {
    app: 'Quick Dialog App',
    status: 'Unhealthy',
    checks: {
      database: {
        status: 'down',
      },
    },
  },
};

export function ApiHealthDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Check service health' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Database connection is healthy',
      schema: healthSwaggerSchema,
    }),
    ApiErrorResponse(
      HttpStatus.SERVICE_UNAVAILABLE,
      'Database connection is unavailable',
      unhealthyHealthExample,
    ),
    ApiGlobalGuardResponses(),
  );
}
