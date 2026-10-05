import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import { createSwaggerConfig } from '@quickdialog/swagger/swagger.config.js';

describe('createSwaggerConfig', () => {
  it('builds the QuickDialog API metadata and authentication schemes', () => {
    const config = {
      get: vi.fn((_key: string, fallback?: unknown) => fallback),
    } as unknown as ConfigService;

    const document = createSwaggerConfig(config);

    expect(document.info).toMatchObject({
      title: 'QuickDialog API',
      description: 'REST API for the QuickDialog hotel messaging platform.',
      version: '1.0',
    });

    expect(document.components?.securitySchemes).toMatchObject({
      'access-token': {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'QuickDialog access token',
      },
      'refresh-token': {
        type: 'apiKey',
        in: 'cookie',
        name: 'refresh_token',
      },
    });
  });
});
