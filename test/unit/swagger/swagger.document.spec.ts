import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { SwaggerModule } from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AuthController } from '@quickdialog/auth/auth.controller.js';
import { AuthService } from '@quickdialog/auth/auth.service.js';
import { BroadcastCampaignsController } from '@quickdialog/broadcast-campaigns/broadcast-campaigns.controller.js';
import { BroadcastCampaignsService } from '@quickdialog/broadcast-campaigns/broadcast-campaigns.service.js';
import { HealthController } from '@quickdialog/health/health.controller.js';
import { HealthService } from '@quickdialog/health/health.service.js';
import { GuestsController } from '@quickdialog/guests/guests.controller.js';
import { GuestsService } from '@quickdialog/guests/guests.service.js';
import { EmbeddedSignupController } from '@quickdialog/whatsapp/embedded-signup/embedded-signup.controller.js';
import { EmbeddedSignupService } from '@quickdialog/whatsapp/embedded-signup/embedded-signup.service.js';
import { CatalogController } from '@quickdialog/whatsapp/catalog/catalog.controller.js';
import { CatalogService } from '@quickdialog/whatsapp/catalog/catalog.service.js';
import { TemplatesController } from '@quickdialog/whatsapp/templates/templates.controller.js';
import { TemplatesService } from '@quickdialog/whatsapp/templates/templates.service.js';
import { WebhookController } from '@quickdialog/whatsapp/webhooks/webhook.controller.js';
import { WebhookService } from '@quickdialog/whatsapp/webhooks/webhook.service.js';
import { WebhookSignatureGuard } from '@quickdialog/whatsapp/webhooks/webhook-signature.guard.js';
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
        BroadcastCampaignsController,
        HealthController,
        GuestsController,
        WhatsappController,
        EmbeddedSignupController,
        CatalogController,
        TemplatesController,
        WebhookController,
      ],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: BroadcastCampaignsService, useValue: {} },
        { provide: HealthService, useValue: {} },
        { provide: GuestsService, useValue: {} },
        { provide: WhatsappService, useValue: {} },
        { provide: EmbeddedSignupService, useValue: {} },
        { provide: CatalogService, useValue: {} },
        { provide: TemplatesService, useValue: {} },
        { provide: WebhookService, useValue: {} },
        {
          provide: WebhookSignatureGuard,
          useValue: { canActivate: () => true },
        },
        {
          provide: PinoLogger,
          useValue: { setContext: vi.fn(), warn: vi.fn() },
        },
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
                enum: ['OWNER', 'STAFF', 'SUPER_ADMIN'],
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
    const register = document.paths['/api/whatsapp/register'].post!;

    for (const operation of [status, disconnect, complete, register]) {
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
                    enum: ['CONNECTED', 'NOT_CONNECTED', 'UNVERIFIED'],
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
      responses: {
        201: {
          content: {
            'application/json': {
              schema: {
                example: { status: 'NOT_CONNECTED' },
              },
            },
          },
        },
      },
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
    expect(register.requestBody).toMatchObject({
      content: {
        'application/json': {
          schema: {
            required: ['pin'],
            properties: { pin: { pattern: '^\\d{6}$' } },
          },
        },
      },
    });
    expect(document.tags).toContainEqual({
      name: 'Whatsapp / Embedded Signup',
      summary: 'Embedded Signup',
      parent: 'Whatsapp',
    });
  });

  it('documents guest operations with their summaries and response statuses', () => {
    const create = document.paths['/api/guests'].post!;
    const list = document.paths['/api/guests'].get!;
    const get = document.paths['/api/guests/{id}'].get!;
    const update = document.paths['/api/guests/{id}'].patch!;
    const remove = document.paths['/api/guests/{id}'].delete!;
    const bulkCreate = document.paths['/api/guests/bulk'].post!;
    const bulkRemove = document.paths['/api/guests/bulk'].delete!;

    expect(create.summary).toBe(
      'Create a guest for the authenticated user’s hotel',
    );
    expect(create.responses).toHaveProperty('201');
    expect(list.summary).toBe('List guests for the authenticated user’s hotel');
    expect(list.responses).toHaveProperty('200');
    expect(get.summary).toBe('Get a guest');
    expect(get.responses).toHaveProperty('200');
    expect(get.responses).toHaveProperty('404');
    expect(update.summary).toBe('Update a guest');
    expect(update.responses).toHaveProperty('200');
    expect(update.responses).toHaveProperty('404');
    expect(remove.summary).toBe('Delete a guest');
    expect(remove.responses).toHaveProperty('204');
    expect(remove.responses).toHaveProperty('404');
    expect(bulkCreate.summary).toBe(
      'Bulk create guests for the authenticated user’s hotel',
    );
    expect(bulkCreate.responses).toHaveProperty('201');
    expect(bulkRemove.summary).toBe(
      'Bulk delete guests from the authenticated user’s hotel',
    );
    expect(bulkRemove.responses).toHaveProperty('200');
  });

  it('includes usable examples for the remaining API modules', () => {
    const get = (path: string) => document.paths[path]!;
    const requestContent = (operation: { requestBody?: unknown }) => {
      const requestBody = operation.requestBody;
      if (
        !requestBody ||
        typeof requestBody !== 'object' ||
        !('content' in requestBody)
      ) {
        return undefined;
      }
      return (
        requestBody as {
          content?: Record<string, { examples?: Record<string, unknown> }>;
        }
      ).content;
    };
    const responseContent = (
      operation: { responses: Record<string, unknown> },
      status: string,
    ) => {
      const response = operation.responses[status];
      if (
        !response ||
        typeof response !== 'object' ||
        !('content' in response)
      ) {
        return undefined;
      }
      return (
        response as {
          content?: Record<
            string,
            {
              schema?: Record<string, unknown>;
              examples?: Record<string, unknown>;
            }
          >;
        }
      ).content;
    };
    const jsonBodyOperations = [
      get('/api/guests').post!,
      get('/api/guests/bulk').post!,
      get('/api/guests/bulk').delete!,
      get('/api/guests/{id}').patch!,
      get('/api/broadcast-campaigns').post!,
      get('/api/broadcast-campaigns/{id}').patch!,
      get('/api/whatsapp/embedded-signup/complete').post!,
      get('/api/whatsapp/register').post!,
      get('/api/whatsapp/catalogs/connect').post!,
      get('/api/whatsapp/catalogs/settings').patch!,
      get('/api/whatsapp/catalogs/{catalogId}/products').post!,
      get('/api/whatsapp/catalogs/{catalogId}/products/{productId}').patch!,
      get('/api/whatsapp/templates').post!,
      get('/api/whatsapp/templates/{id}').patch!,
      get('/api/whatsapp/webhooks').post!,
    ];

    for (const operation of jsonBodyOperations) {
      expect(
        Object.keys(
          requestContent(operation)?.['application/json']?.examples ?? {},
        ),
      ).not.toHaveLength(0);
    }

    const templateMediaUpload = get('/api/whatsapp/templates/media').post!;
    expect(
      requestContent(templateMediaUpload)?.['image/png']?.examples,
    ).toHaveProperty('image');

    for (const operation of [
      get('/api/guests').post!,
      get('/api/broadcast-campaigns').post!,
      get('/api/whatsapp/templates').post!,
    ]) {
      expect(operation.security).toEqual([{ 'access-token': [] }]);
    }
    expect(get('/api/whatsapp/webhooks').post!.security).toBeUndefined();

    const responseExamples = [
      [get('/api/guests').post!, '201'],
      [get('/api/guests').get!, '200'],
      [get('/api/guests/{id}').get!, '200'],
      [get('/api/guests/{id}').patch!, '200'],
      [get('/api/guests/bulk').post!, '201'],
      [get('/api/guests/bulk').delete!, '200'],
      [get('/api/broadcast-campaigns').post!, '201'],
      [get('/api/broadcast-campaigns').get!, '200'],
      [get('/api/broadcast-campaigns/{id}').get!, '200'],
      [get('/api/broadcast-campaigns/{id}').patch!, '200'],
      [get('/api/broadcast-campaigns/{id}/preview').post!, '200'],
      [get('/api/broadcast-campaigns/{id}/start').post!, '200'],
      [get('/api/whatsapp/status').get!, '200'],
      [get('/api/whatsapp/disconnect').post!, '201'],
      [get('/api/whatsapp/embedded-signup/complete').post!, '201'],
      [get('/api/whatsapp/register').post!, '201'],
      [get('/api/whatsapp/catalogs/connect').post!, '201'],
      [get('/api/whatsapp/catalogs/disconnect').post!, '201'],
      [get('/api/whatsapp/catalogs/connection').get!, '200'],
      [get('/api/whatsapp/catalogs/available').get!, '200'],
      [get('/api/whatsapp/catalogs').get!, '200'],
      [get('/api/whatsapp/catalogs/{catalogId}/products').get!, '200'],
      [get('/api/whatsapp/catalogs/{catalogId}/products').post!, '202'],
      [
        get('/api/whatsapp/catalogs/{catalogId}/products/{productId}').patch!,
        '202',
      ],
      [
        get('/api/whatsapp/catalogs/{catalogId}/products/{productId}').delete!,
        '202',
      ],
      [
        get('/api/whatsapp/catalogs/{catalogId}/operations/{handle}').get!,
        '200',
      ],
      [get('/api/whatsapp/templates').get!, '200'],
      [get('/api/whatsapp/templates').post!, '201'],
      [get('/api/whatsapp/templates/{id}').get!, '200'],
      [get('/api/whatsapp/templates/{id}').patch!, '200'],
      [get('/api/whatsapp/templates/media').post!, '201'],
      [get('/api/whatsapp/webhooks').post!, '200'],
      [get('/api/health').get!, '200'],
    ] as const;

    for (const [operation, status] of responseExamples) {
      expect(
        responseContent(operation, status)?.['application/json']?.schema,
      ).toHaveProperty('example');
    }

    expect(
      responseContent(get('/api/whatsapp/webhooks').get!, '200')?.['text/plain']
        ?.schema,
    ).toHaveProperty('example');
  });

  it('documents protected WhatsApp catalog operations', () => {
    const connect = document.paths['/api/whatsapp/catalogs/connect'].post!;
    const disconnect =
      document.paths['/api/whatsapp/catalogs/disconnect'].post!;
    const connection = document.paths['/api/whatsapp/catalogs/connection'].get!;
    const available = document.paths['/api/whatsapp/catalogs/available'].get!;
    const settings = document.paths['/api/whatsapp/catalogs/settings'].patch!;

    for (const operation of [
      connect,
      disconnect,
      connection,
      available,
      settings,
    ]) {
      expect(operation).toMatchObject({ tags: ['Whatsapp / Catalogs'] });
      expect(operation.security).toEqual([{ 'access-token': [] }]);
      expect(operation.responses).toHaveProperty('401');
      expect(operation.responses).toHaveProperty('403');
      expect(operation.responses).toHaveProperty('429');
    }

    expect(connect).toMatchObject({
      summary: 'Connect a product catalog to WhatsApp',
      requestBody: {
        content: {
          'application/json': {
            schema: {
              required: ['catalogId'],
              properties: { catalogId: { minLength: 1 } },
            },
          },
        },
      },
    });
    expect(connect.responses).toHaveProperty('201');
    expect(disconnect.responses).toHaveProperty('201');
    expect(connection.responses).toHaveProperty('200');
    expect(available.responses).toHaveProperty('200');
    expect(settings).toMatchObject({
      requestBody: {
        content: {
          'application/json': {
            schema: {
              properties: {
                catalogVisible: { type: 'boolean' },
                cartEnabled: { type: 'boolean' },
              },
            },
          },
        },
      },
    });
    expect(settings.responses).toHaveProperty('200');
    expect(document.tags).toContainEqual({
      name: 'Whatsapp / Catalogs',
      summary: 'Catalogs',
      parent: 'Whatsapp',
    });
  });
});
