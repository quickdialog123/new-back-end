import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { HealthService } from '@quickdialog/health/health.service.js';

describe('HealthService', () => {
  let service: HealthService;

  const prisma = {
    $queryRaw: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = moduleRef.get(HealthService);
  });

  it('returns healthy when database query succeeds', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        result: 1,
      },
    ]);

    const result = await service.check();

    expect(result).toEqual({
      app: 'Quick Dialog App',
      status: 'Healthy',
      checks: {
        database: {
          status: 'up',
        },
      },
    });

    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
  });

  it('throws ServiceUnavailableException when database query fails', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('database down'));

    await expect(service.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns unhealthy payload inside the exception', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('database down'));

    try {
      await service.check();

      throw new Error('Expected health check to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);

      const exception = error as ServiceUnavailableException;

      expect(exception.getResponse()).toEqual({
        app: 'Quick Dialog App',
        status: 'Unhealthy',
        checks: {
          database: {
            status: 'down',
          },
        },
      });
    }
  });
});
