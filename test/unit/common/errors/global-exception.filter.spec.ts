import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { FILTER_CATCH_EXCEPTIONS } from '@nestjs/common/constants';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GlobalExceptionFilter } from '@quickdialog/common/errors/global-exception.filter.js';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  const reply = vi.fn();
  const getRequestUrl = vi.fn();
  const getRequestMethod = vi.fn();

  const httpAdapter = {
    reply,
    getRequestUrl,
    getRequestMethod,
  };

  const logger = {
    setContext: vi.fn(),
    error: vi.fn(),
  };

  const response = {};

  const request = {
    id: 'request-id',
    method: 'POST',
    url: '/api/test',
  };

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,

      getResponse: () => response,
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    getRequestUrl.mockReturnValue('/api/test');

    getRequestMethod.mockReturnValue('POST');

    const moduleRef = await Test.createTestingModule({
      providers: [
        GlobalExceptionFilter,

        {
          provide: HttpAdapterHost,

          useValue: {
            httpAdapter,
          },
        },

        {
          provide: PinoLogger,

          useValue: logger,
        },
      ],
    }).compile();

    filter = moduleRef.get(GlobalExceptionFilter);
  });

  it('sets logger context', () => {
    expect(logger.setContext).toHaveBeenCalledWith(GlobalExceptionFilter.name);
  });

  it('registers as a catch-all filter with injectable dependencies', () => {
    expect(
      Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS, GlobalExceptionFilter),
    ).toEqual([]);
    expect(
      Reflect.getMetadata('design:paramtypes', GlobalExceptionFilter),
    ).toEqual([HttpAdapterHost, PinoLogger]);
  });

  it('formats BadRequestException', () => {
    filter.catch(
      new BadRequestException('Bad input'),

      host as never,
    );

    expect(reply).toHaveBeenCalledWith(
      response,

      expect.objectContaining({
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'Bad input',
        path: '/api/test',

        requestId: 'request-id',

        timestamp: expect.any(String),
      }),

      400,
    );

    expect(logger.error).not.toHaveBeenCalled();
  });

  it('formats UnauthorizedException', () => {
    filter.catch(
      new UnauthorizedException('Invalid token'),

      host as never,
    );

    expect(reply).toHaveBeenCalledWith(
      response,

      expect.objectContaining({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Invalid token',
      }),

      401,
    );
  });

  it('formats a string exception response', () => {
    filter.catch(
      new HttpException('Bad input', HttpStatus.BAD_REQUEST),
      host as never,
    );

    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({
        code: 'BAD_REQUEST',
        message: 'Bad input',
      }),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('formats ForbiddenException', () => {
    filter.catch(new ForbiddenException(), host as never);

    expect(reply).toHaveBeenCalledWith(
      response,

      expect.objectContaining({
        statusCode: 403,
        code: 'FORBIDDEN',
      }),

      403,
    );
  });

  it('formats NotFoundException', () => {
    filter.catch(new NotFoundException(), host as never);

    expect(reply).toHaveBeenCalledWith(
      response,

      expect.objectContaining({
        statusCode: 404,
        code: 'NOT_FOUND',
      }),

      404,
    );
  });

  it('formats ConflictException', () => {
    filter.catch(new ConflictException(), host as never);

    expect(reply).toHaveBeenCalledWith(
      response,

      expect.objectContaining({
        statusCode: 409,
        code: 'CONFLICT',
      }),

      409,
    );
  });

  it('formats service unavailable exception', () => {
    filter.catch(new ServiceUnavailableException(), host as never);

    expect(reply).toHaveBeenCalledWith(
      response,

      expect.objectContaining({
        statusCode: 503,

        code: 'SERVICE_UNAVAILABLE',
      }),

      503,
    );
  });

  it('uses custom error code and details', () => {
    filter.catch(
      new BadRequestException({
        code: 'VALIDATION_ERROR',

        message: 'Request validation failed',

        details: [
          {
            field: 'email',
            message: 'Invalid email',
          },
        ],
      }),

      host as never,
    );

    expect(reply).toHaveBeenCalledWith(
      response,

      expect.objectContaining({
        statusCode: 400,

        code: 'VALIDATION_ERROR',

        message: 'Request validation failed',

        details: [
          {
            field: 'email',
            message: 'Invalid email',
          },
        ],
      }),

      400,
    );
  });

  it('joins message arrays', () => {
    filter.catch(
      new BadRequestException({
        message: ['Email invalid', 'Password invalid'],
      }),

      host as never,
    );

    expect(reply).toHaveBeenCalledWith(
      response,

      expect.objectContaining({
        message: 'Email invalid, Password invalid',
      }),

      400,
    );
  });

  it('extracts custom payload as details', () => {
    filter.catch(
      new ServiceUnavailableException({
        message: 'Service unavailable',

        database: {
          status: 'down',
        },
      }),

      host as never,
    );

    expect(reply).toHaveBeenCalledWith(
      response,

      expect.objectContaining({
        details: {
          database: {
            status: 'down',
          },
        },
      }),

      503,
    );
  });

  it('does not create details for standard Nest body', () => {
    filter.catch(new UnauthorizedException(), host as never);

    const body = reply.mock.calls[0][1];

    expect(body.details).toBeUndefined();
  });

  it('uses fallback message when message is missing', () => {
    filter.catch(
      new HttpException({}, HttpStatus.NOT_FOUND),

      host as never,
    );

    expect(reply).toHaveBeenCalledWith(
      response,

      expect.objectContaining({
        code: 'NOT_FOUND',
        message: 'Not found',
      }),

      404,
    );
  });

  it('uses the default unauthorized message when it is missing', () => {
    filter.catch(new HttpException({}, HttpStatus.UNAUTHORIZED), host as never);

    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      }),
      HttpStatus.UNAUTHORIZED,
    );
  });

  it('uses fallback fields for an empty message array', () => {
    filter.catch(
      new HttpException({ message: [] }, HttpStatus.BAD_REQUEST),
      host as never,
    );

    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({ message: 'Bad request' }),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('uses fallback fields for an unsupported exception response', () => {
    const exception = new HttpException({}, HttpStatus.BAD_REQUEST);
    vi.spyOn(exception, 'getResponse').mockReturnValue(undefined as never);

    filter.catch(exception, host as never);

    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({
        code: 'BAD_REQUEST',
        message: 'Bad request',
      }),
      HttpStatus.BAD_REQUEST,
    );
  });

  it.each([
    [HttpStatus.BAD_REQUEST, 'BAD_REQUEST', 'Bad request'],
    [HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Forbidden'],
    [HttpStatus.CONFLICT, 'CONFLICT', 'Conflict'],
    [
      HttpStatus.SERVICE_UNAVAILABLE,
      'SERVICE_UNAVAILABLE',
      'Service unavailable',
    ],
  ])('uses the default response for status %i', (status, code, message) => {
    filter.catch(new HttpException({}, status), host as never);

    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({ code, message }),
      status,
    );
  });

  it('formats unprocessable entity', () => {
    filter.catch(
      new HttpException({}, HttpStatus.UNPROCESSABLE_ENTITY),

      host as never,
    );

    expect(reply).toHaveBeenCalledWith(
      response,

      expect.objectContaining({
        code: 'UNPROCESSABLE_ENTITY',

        message: 'Unprocessable entity',
      }),

      422,
    );
  });

  it('formats too many requests', () => {
    filter.catch(
      new HttpException({}, HttpStatus.TOO_MANY_REQUESTS),

      host as never,
    );

    expect(reply).toHaveBeenCalledWith(
      response,

      expect.objectContaining({
        code: 'TOO_MANY_REQUESTS',

        message: 'Too many requests',
      }),

      429,
    );
  });

  it('uses HTTP_ERROR for unknown non-5xx status', () => {
    filter.catch(
      new HttpException({}, 418),

      host as never,
    );

    expect(reply).toHaveBeenCalledWith(
      response,

      expect.objectContaining({
        code: 'HTTP_ERROR',

        message: 'Request failed',
      }),

      418,
    );
  });

  it('uses INTERNAL_SERVER_ERROR for unknown 5xx HttpException', () => {
    filter.catch(
      new HttpException({}, 599),

      host as never,
    );

    expect(reply).toHaveBeenCalledWith(
      response,

      expect.objectContaining({
        code: 'INTERNAL_SERVER_ERROR',

        message: 'Internal server error',
      }),

      599,
    );
  });

  it('hides unexpected exception details and logs it', () => {
    const error = new Error('secret database error');

    filter.catch(
      error,

      host as never,
    );

    expect(reply).toHaveBeenCalledWith(
      response,

      expect.objectContaining({
        statusCode: 500,

        code: 'INTERNAL_SERVER_ERROR',

        message: 'Internal server error',
      }),

      500,
    );

    expect(logger.error).toHaveBeenCalledWith(
      {
        err: error,

        requestId: 'request-id',

        method: 'POST',

        path: '/api/test',
      },

      'Unhandled request exception',
    );
  });
});
