import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import { apiErrorSchema } from '../schemas/error.swagger.js';

export function ApiErrorResponse(
  status: number,
  description: string,
  example?: object,
) {
  return ApiResponse({
    status,
    description,
    schema: {
      ...apiErrorSchema,
      ...(example === undefined ? {} : { example }),
    },
  });
}

export function ApiGlobalGuardResponses() {
  return applyDecorators(
    ApiErrorResponse(
      HttpStatus.FORBIDDEN,
      'Request origin is missing or not allowed in production',
    ),
    ApiErrorResponse(HttpStatus.TOO_MANY_REQUESTS, 'Too many requests'),
  );
}
