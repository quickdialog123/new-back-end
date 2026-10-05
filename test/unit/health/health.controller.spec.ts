import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HealthController } from '@quickdialog/health/health.controller.js';
import { HealthService } from '@quickdialog/health/health.service.js';

describe('HealthController', () => {
  let controller: HealthController;

  const healthService = {
    check: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],

      providers: [
        {
          provide: HealthService,
          useValue: healthService,
        },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns health service result', async () => {
    const expected = {
      app: 'Quick Dialog App',
      status: 'Healthy',
      checks: {
        database: {
          status: 'up',
        },
      },
    };

    healthService.check.mockResolvedValue(expected);

    await expect(controller.check()).resolves.toEqual(expected);

    expect(healthService.check).toHaveBeenCalledOnce();
  });
});
