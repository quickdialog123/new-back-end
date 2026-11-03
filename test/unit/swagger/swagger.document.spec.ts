import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { SwaggerModule } from '@nestjs/swagger';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AuthController } from '@quickdialog/auth/auth.controller.js';
import { AuthService } from '@quickdialog/auth/auth.service.js';
import { HealthController } from '@quickdialog/health/health.controller.js';
import { HealthService } from '@quickdialog/health/health.service.js';
import { EmbeddedSignupController } from '@quickdialog/whatsapp/embedded-signup/embedded-signup.controller.js';
import { EmbeddedSignupService } from '@quickdialog/whatsapp/embedded-signup/embedded-signup.service.js';
import { MetaGraphClient } from '@quickdialog/whatsapp/meta/meta-graph.client.js';
import { WhatsappController } from '@quickdialog/whatsapp/whatsapp.controller.js';
import { WhatsappService } from '@quickdialog/whatsapp/whatsapp.service.js';
import { createSwaggerConfig } from '@quickdialog/swagger/swagger.config.js';
import { buildNestedTags } from '@quickdialog/swagger/swagger.tags.js';

describe('Swagger API contract', () => {
  let app: NestFastifyApplication;
  let document: ReturnType<typeof SwaggerModule.createDocument>;

  beforeAll(async () => {
    const config = {
      get: vi.fn((_key: string, fallback?: unknown) => fallback),
    } as unknown as ConfigService;

    const moduleRef = await Test.createTestingModule({
      controllers: [
        AuthController,
        HealthController,
        WhatsappController,
        EmbeddedSignupController,
      ],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: HealthService, useValue: {} },
        { provide: WhatsappService, useValue: {} },
        { provide: EmbeddedSignupService, useValue: {} },
        { provide: MetaGraphClient, useValue: {} },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.setGlobalPrefix('api');
    await app.init();

    document = SwaggerModule.createDocument(app, createSwaggerConfig(config));
    buildNestedTags(document);
  });

  afterAll(async () => {
    await app.close();
  });

  it('documents public auth and health operations without bearer security', () => {
    const login = document.paths['/api/auth/login'].post!;
    const refresh = document.paths['/api/auth/refresh'].post!;
    const health = document.paths['/api/health'].get!;

    expect(login).toMatchObject({
      tags: ['Auth'],
      summary: 'Authenticate a user',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              required: ['email', 'password'],
            },
          },
        },
      },
    });
    expect(login.responses).toHaveProperty('201');
    expect(login.responses).toHaveProperty('400');
    expect(login.responses).toHaveProperty('401');
    expect(login.responses).toHaveProperty('403');
    expect(login.responses).toHaveProperty('429');
    expect(login.security).toBeUndefined();
    expect(login.requestBody).toMatchObject({
      content: {
        'application/json': {
          schema: {
            properties: {
              email: { format: 'email' },
              password: { minLength: 1 },
            },
          },
        },
      },
    });
    expect(login.responses['201']).toMatchObject({
      headers: {
        'Set-Cookie': {
          schema: {
            example:
              'refresh_token=<refresh-token>; HttpOnly; SameSite=Lax; Path=/api/auth',
          },
        },
      },
    });

    expect(refresh).toMatchObject({
      summary: 'Refresh an access token',
      security: [{ 'refresh-token': [] }],
    });
    expect(refresh.responses).toHaveProperty('201');
    expect(refresh.responses).toHaveProperty('401');
    expect(refresh.responses).toHaveProperty('403');
    expect(refresh.responses).toHaveProperty('429');

    expect(health).toMatchObject({
      tags: ['Health'],
      summary: 'Check service health',
    });
    expect(health.responses).toHaveProperty('200');
    expect(health.responses).toHaveProperty('503');
    expect(health.responses).toHaveProperty('403');
    expect(health.responses).toHaveProperty('429');
    expect(health.security).toBeUndefined();
    expect(health.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: {
            properties: {
              checks: {
                properties: {
                  database: {
                    properties: {
                      status: { enum: ['up'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  it('documents protected auth operations with the access-token scheme', () => {
    const me = document.paths['/api/auth/me'].get!;
    const logout = document.paths['/api/auth/logout'].post!;
    const logoutAll = document.paths['/api/auth/logout-all'].post!;

    for (const operation of [me, logout, logoutAll]) {
      expect(operation.security).toEqual([{ 'access-token': [] }]);
      expect(operation.responses).toHaveProperty('401');
      expect(operation.responses).toHaveProperty('403');
      expect(operation.responses).toHaveProperty('429');
    }

    expect(me.responses).toHaveProperty('200');
    expect(me.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: {
            properties: {
              hotelId: { nullable: true },
              role: {
                enum: ['OWNER', 'STAFF', 'SUPER_ADMIN', 'CLIENT', 'AUTHORITY'],
              },
            },
          },
        },
      },
    });
    expect(logout.responses).toHaveProperty('204');
    expect(logoutAll.responses).toHaveProperty('204');
  });

  it('documents protected WhatsApp lifecycle operations', () => {
    const status = document.paths['/api/whatsapp/status'].get!;
    const disconnect = document.paths['/api/whatsapp/disconnect'].post!;
    const complete =
      document.paths['/api/whatsapp/embedded-signup/complete'].post!;

    for (const operation of [status, disconnect, complete]) {
      expect(operation.security).toEqual([{ 'access-token': [] }]);
      expect(operation.responses).toHaveProperty('401');
      expect(operation.responses).toHaveProperty('403');
      expect(operation.responses).toHaveProperty('429');
    }

    expect(status).toMatchObject({
      tags: ['Whatsapp'],
      summary: 'Get WhatsApp connection status',
      responses: {
        200: {
          content: {
            'application/json': {
              schema: {
                required: [
                  'status',
                  'wabaId',
                  'phoneNumber',
                  'displayName',
                  'wabaStatus',
                  'qualityRating',
                  'connectedAt',
                  'errorMessage',
                ],
                properties: {
                  status: {
                    enum: ['connected', 'not_connected', 'error'],
                  },
                  connectedAt: { format: 'date-time', nullable: true },
                },
              },
            },
          },
        },
      },
    });
    expect(status.responses).toHaveProperty('400');
    expect(disconnect).toMatchObject({
      tags: ['Whatsapp'],
      summary: 'Disconnect WhatsApp',
      responses: { 201: status.responses['200'] },
    });
    expect(disconnect.responses).toHaveProperty('400');
    expect(complete).toMatchObject({
      tags: ['Whatsapp / Embedded Signup'],
      summary: 'Complete WhatsApp Embedded Signup',
      responses: { 201: status.responses['200'] },
      requestBody: {
        content: {
          'application/json': {
            schema: {
              required: ['code', 'wabaId', 'phoneNumberId'],
              properties: {
                code: { minLength: 1 },
                wabaId: { minLength: 1 },
                phoneNumberId: { minLength: 1 },
              },
            },
          },
        },
      },
    });
    expect(complete.responses).toHaveProperty('201');
    expect(complete.responses).toHaveProperty('400');
    expect(complete.responses).toHaveProperty('404');
    expect(document.tags).toContainEqual({
      name: 'Whatsapp / Embedded Signup',
      summary: 'Embedded Signup',
      parent: 'Whatsapp',
    });
  });
});
