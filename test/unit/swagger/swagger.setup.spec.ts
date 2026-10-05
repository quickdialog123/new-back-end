import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setupSwagger } from '@quickdialog/swagger/swagger.setup.js';

describe('setupSwagger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when swagger is disabled', () => {
    const createDocument = vi.spyOn(SwaggerModule, 'createDocument');

    const setup = vi.spyOn(SwaggerModule, 'setup');

    const config = {
      get: vi.fn((key: string) => {
        if (key === 'swagger.enabled') {
          return false;
        }

        return undefined;
      }),
    };

    setupSwagger({} as never, config as unknown as ConfigService);

    expect(createDocument).not.toHaveBeenCalled();

    expect(setup).not.toHaveBeenCalled();
  });

  it('creates and mounts swagger when enabled', () => {
    const document = {
      openapi: '3.0.0',
    };

    const createDocument = vi
      .spyOn(SwaggerModule, 'createDocument')
      .mockReturnValue(document as never);

    const setup = vi
      .spyOn(SwaggerModule, 'setup')
      .mockImplementation(() => undefined);

    const app = {};

    const config = {
      get: vi.fn((key: string, fallback?: unknown) => {
        const values: Record<string, unknown> = {
          'swagger.enabled': true,

          'swagger.path': 'docs',

          'swagger.title': 'QuickDialog API',

          'swagger.description': 'QuickDialog backend API',

          'swagger.version': '1.0',
        };

        return values[key] ?? fallback;
      }),
    };

    setupSwagger(
      app as never,

      config as unknown as ConfigService,
    );

    expect(createDocument).toHaveBeenCalledOnce();

    expect(setup).toHaveBeenCalledWith('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  });

  it('uses default docs path', () => {
    vi.spyOn(SwaggerModule, 'createDocument').mockReturnValue({} as never);

    const setup = vi
      .spyOn(SwaggerModule, 'setup')
      .mockImplementation(() => undefined);

    const config = {
      get: vi.fn((key: string, fallback?: unknown) => {
        if (key === 'swagger.enabled') {
          return true;
        }

        return fallback;
      }),
    };

    setupSwagger(
      {} as never,

      config as unknown as ConfigService,
    );

    expect(setup.mock.calls[0][0]).toBe('docs');
  });
});
