import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';

import type { ApiErrorResponse } from './api-error-response.type.js';

type HttpExceptionBody = {
  code?: string;
  message?: string | string[];
  details?: unknown;
  [key: string]: unknown;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;
    const context = host.switchToHttp();
    const request = context.getRequest();

    const isHttpException = exception instanceof HttpException;

    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const { code, message, details } = this.extractError(exception, statusCode);

    const response: ApiErrorResponse = {
      statusCode,
      code,
      message,
      path: httpAdapter.getRequestUrl(request),
      requestId: request.id,
      timestamp: new Date().toISOString(),

      ...(details !== undefined && {
        details,
      }),
    };

    /**
     * Only log truly unexpected exceptions here.
     *
     * Known HttpExceptions are already represented
     * by their HTTP status and will be logged by pino-http.
     */
    if (!isHttpException) {
      this.logger.error(
        {
          err: exception,
          requestId: request.id,
          method: httpAdapter.getRequestMethod(request),
          path: httpAdapter.getRequestUrl(request),
        },
        'Unhandled request exception',
      );
    }

    httpAdapter.reply(context.getResponse(), response, statusCode);
  }

  private extractError(
    exception: unknown,
    statusCode: number,
  ): {
    code: string;
    message: string;
    details?: unknown;
  } {
    /**
     * Unknown/unexpected exceptions.
     *
     * Never expose their internal error information
     * to the client.
     */
    if (!(exception instanceof HttpException)) {
      return {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      };
    }

    const exceptionResponse = exception.getResponse();

    /**
     * Example:
     *
     * throw new UnauthorizedException(
     *   'Invalid email or password'
     * );
     */
    if (typeof exceptionResponse === 'string') {
      return {
        code: this.defaultCodeForStatus(statusCode),
        message: exceptionResponse,
      };
    }

    /**
     * Object-based Nest exception.
     */
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const body = exceptionResponse as HttpExceptionBody;

      const details = this.extractDetails(body);

      return {
        code: body.code ?? this.defaultCodeForStatus(statusCode),

        message: this.normalizeMessage(body.message, statusCode),

        ...(details !== undefined && {
          details,
        }),
      };
    }

    return {
      code: this.defaultCodeForStatus(statusCode),
      message: this.defaultMessageForStatus(statusCode),
    };
  }

  private extractDetails(body: HttpExceptionBody): unknown {
    /**
     * Explicit details always win.
     *
     * Used by validation errors:
     *
     * {
     *   code: 'VALIDATION_ERROR',
     *   message: 'Request validation failed',
     *   details: [...]
     * }
     */
    if (body.details !== undefined) {
      return body.details;
    }

    /**
     * Standard Nest exception bodies usually contain
     * fields such as:
     *
     * {
     *   statusCode: 401,
     *   message: 'Unauthorized'
     * }
     *
     * These should NOT become details.
     */
    const knownKeys = new Set(['statusCode', 'code', 'message', 'error']);

    const customPayload = Object.fromEntries(
      Object.entries(body).filter(([key]) => !knownKeys.has(key)),
    );

    return Object.keys(customPayload).length > 0 ? customPayload : undefined;
  }

  private normalizeMessage(
    message: string | string[] | undefined,
    statusCode: number,
  ): string {
    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message) && message.length > 0) {
      return message.join(', ');
    }

    return this.defaultMessageForStatus(statusCode);
  }

  private defaultCodeForStatus(statusCode: number): string {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';

      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';

      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';

      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';

      case HttpStatus.CONFLICT:
        return 'CONFLICT';

      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';

      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';

      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';

      default:
        return statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'HTTP_ERROR';
    }
  }

  private defaultMessageForStatus(statusCode: number): string {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad request';

      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';

      case HttpStatus.FORBIDDEN:
        return 'Forbidden';

      case HttpStatus.NOT_FOUND:
        return 'Not found';

      case HttpStatus.CONFLICT:
        return 'Conflict';

      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'Unprocessable entity';

      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Too many requests';

      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'Service unavailable';

      default:
        return statusCode >= 500 ? 'Internal server error' : 'Request failed';
    }
  }
}
