import {
  ArgumentsHost,
  Catch,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';

import { Prisma } from '@quickdialog/generated/prisma/client.js';
import type { ApiErrorResponse } from './api-error-response.type.js';

@Catch(Prisma.PrismaClientKnownRequestError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(DatabaseExceptionFilter.name);
  }

  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const { httpAdapter } = this.adapterHost;
    const context = host.switchToHttp();
    const request = context.getRequest();
    const { statusCode, code, message } = this.mapError(exception);

    if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        {
          err: exception,
          requestId: request.id,
          method: httpAdapter.getRequestMethod(request),
          path: httpAdapter.getRequestUrl(request),
        },
        'Unhandled database exception',
      );
    }

    const response: ApiErrorResponse = {
      statusCode,
      code,
      message,
      path: httpAdapter.getRequestUrl(request),
      requestId: request.id,
      timestamp: new Date().toISOString(),
    };

    httpAdapter.reply(context.getResponse(), response, statusCode);
  }

  private mapError(exception: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    code: string;
    message: string;
  } {
    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          code: 'CONFLICT',
          message: 'A record with this value already exists',
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message: 'Record not found',
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        };
    }
  }
}
