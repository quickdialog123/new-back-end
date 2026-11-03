import { HttpStatus } from '@nestjs/common';
import { FILTER_CATCH_EXCEPTIONS } from '@nestjs/common/constants';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseExceptionFilter } from '@quickdialog/common/errors/database-exception.filter.js';
import { Prisma } from '@quickdialog/generated/prisma/client.js';

describe('DatabaseExceptionFilter', () => {
  let filter: DatabaseExceptionFilter;

  const reply = vi.fn();
  const getRequestUrl = vi.fn();
  const getRequestMethod = vi.fn();
  const httpAdapter = { reply, getRequestUrl, getRequestMethod };
  const logger = { setContext: vi.fn(), error: vi.fn() };
  const response = {};
  const request = { id: 'request-id', method: 'POST', url: '/api/test' };
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
        DatabaseExceptionFilter,
        { provide: HttpAdapterHost, useValue: { httpAdapter } },
        { provide: PinoLogger, useValue: logger },
      ],
    }).compile();
    filter = moduleRef.get(DatabaseExceptionFilter);
  });

  it('registers for Prisma known-request errors only', () => {
    expect(
      Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS, DatabaseExceptionFilter),
    ).toEqual([Prisma.PrismaClientKnownRequestError]);
  });

  it('maps unique-constraint errors to conflicts', () => {
    filter.catch(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
      host as never,
    );

    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        code: 'CONFLICT',
        message: 'A record with this value already exists',
      }),
      HttpStatus.CONFLICT,
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('maps missing-record errors to not found', () => {
    filter.catch(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '7.10.0',
      }),
      host as never,
    );

    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        code: 'NOT_FOUND',
        message: 'Record not found',
      }),
      HttpStatus.NOT_FOUND,
    );
    expect(logger.error).not.toHaveBeenCalled();
  });
});
