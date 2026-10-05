/**
 * Auth Swagger documentation.
 * https://docs.nestjs.com/openapi/decorators
 */

import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import {
  createUnauthorizedExample,
  currentUserExample,
  loginSuccessExample,
  validationErrorExample,
} from '../examples/auth.examples.js';
import {
  ApiErrorResponse,
  ApiGlobalGuardResponses,
} from './common-response.decorator.js';
import {
  accessTokenSwaggerSchema,
  authenticatedUserSwaggerSchema,
  loginRequestSwaggerSchema,
} from '../schemas/auth.swagger.js';

export function ApiLoginDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Authenticate a user',
      description:
        'Validates the provided email and password and returns a short-lived access token.',
    }),
    ApiBody({ schema: loginRequestSwaggerSchema }),

    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Authentication successful',
      schema: {
        ...accessTokenSwaggerSchema,
        example: loginSuccessExample,
      },
      headers: refreshCookieHeader,
    }),

    ApiErrorResponse(
      HttpStatus.BAD_REQUEST,
      'Request validation failed',
      validationErrorExample,
    ),

    ApiErrorResponse(
      HttpStatus.UNAUTHORIZED,
      'Invalid email or password',
      createUnauthorizedExample('/api/auth/login', 'Invalid email or password'),
    ),

    ApiGlobalGuardResponses(),
  );
}

export function ApiMeDocs() {
  return applyDecorators(
    ApiBearerAuth('access-token'),

    ApiOperation({
      summary: 'Get current authenticated user',
      description:
        'Returns the authenticated user identity extracted from the access token.',
    }),

    ApiResponse({
      status: HttpStatus.OK,
      description: 'Authenticated user returned successfully',
      schema: {
        ...authenticatedUserSwaggerSchema,
        example: currentUserExample,
      },
    }),

    ApiErrorResponse(
      HttpStatus.UNAUTHORIZED,
      'Missing, expired, or invalid access token',
      createUnauthorizedExample('/api/auth/me', 'Unauthorized'),
    ),
    ApiGlobalGuardResponses(),
  );
}

export function ApiRefreshDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Refresh an access token',
      description:
        'Uses the HttpOnly refresh_token cookie to rotate the refresh token and return a new short-lived access token.',
    }),
    ApiCookieAuth('refresh-token'),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Access token refreshed successfully',
      schema: {
        ...accessTokenSwaggerSchema,
        example: loginSuccessExample,
      },
      headers: refreshCookieHeader,
    }),
    ApiErrorResponse(
      HttpStatus.UNAUTHORIZED,
      'Missing, expired, revoked, or invalid refresh token',
      createUnauthorizedExample(
        '/api/auth/refresh',
        'Invalid email or password',
      ),
    ),
    ApiGlobalGuardResponses(),
  );
}

export function ApiLogoutDocs() {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Log out the current session',
      description:
        'Revokes the current refresh session when its refresh_token cookie is present and clears the cookie.',
    }),
    ApiResponse({
      status: HttpStatus.NO_CONTENT,
      description: 'Refresh cookie cleared',
      headers: refreshCookieHeader,
    }),
    ApiErrorResponse(
      HttpStatus.UNAUTHORIZED,
      'Missing, expired, or invalid access token',
      createUnauthorizedExample('/api/auth/logout', 'Unauthorized'),
    ),
    ApiGlobalGuardResponses(),
  );
}

export function ApiLogoutAllDocs() {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Log out from all sessions',
      description:
        'Revokes every active refresh session for the authenticated user.',
    }),
    ApiResponse({
      status: HttpStatus.NO_CONTENT,
      description: 'All refresh sessions revoked and cookie cleared',
      headers: refreshCookieHeader,
    }),
    ApiErrorResponse(
      HttpStatus.UNAUTHORIZED,
      'Missing, expired, or invalid access token',
      createUnauthorizedExample('/api/auth/logout-all', 'Unauthorized'),
    ),
    ApiGlobalGuardResponses(),
  );
}

const refreshCookieHeader = {
  'Set-Cookie': {
    description:
      'Sets or clears the HttpOnly refresh_token cookie. Its path is /<API_PREFIX>/auth.',
    schema: {
      type: 'string',
      example:
        'refresh_token=<refresh-token>; HttpOnly; SameSite=Lax; Path=/api/auth',
    },
  },
};
