import bcrypt from 'bcryptjs';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { AppModule } from '@quickdialog/app.module.js';
import { AuthService } from '@quickdialog/auth/auth.service.js';
import { createValidationException } from '@quickdialog/common/errors/validation-exception.factory.js';
import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { MetaGraphClient } from '@quickdialog/whatsapp/meta/meta-graph.client.js';
import { encryptMetaToken } from '@quickdialog/whatsapp/meta/meta-token.util.js';

describe('WhatsApp catalog HTTP integration', () => {
  let moduleRef: TestingModule;
  let app: NestFastifyApplication;
  let authService: AuthService;
  let prisma: PrismaService;
  const meta = {
    connectCatalogToWaba: vi.fn(),
    disconnectCatalogFromWaba: vi.fn(),
    getAssignedCatalogs: vi.fn(),
    getCommerceSettings: vi.fn(),
    getSystemUserId: vi.fn(),
    getWabaCatalogs: vi.fn(),
    updateCommerceSettings: vi.fn(),
  };
  const catalog = {
    id: 'catalog-id',
    name: 'Hotel catalog',
    vertical: 'commerce',
    product_count: 10,
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MetaGraphClient)
      .useValue(meta)
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    const config = app.get(ConfigService);
    app.setGlobalPrefix(config.getOrThrow<string>('app.prefix'));
    app.useGlobalPipes(
      new StandardSchemaValidationPipe({
        exceptionFactory: createValidationException,
      }),
    );
    await app.init();

    authService = app.get(AuthService);
    prisma = app.get(PrismaService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await prisma.whatsAppAccount.deleteMany();
    await prisma.refreshSession.deleteMany();
    await prisma.user.deleteMany();
    await prisma.hotel.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createAuthorization(role: 'OWNER' | 'STAFF' = 'OWNER') {
    const user = await prisma.user.create({
      data: {
        email: `${role.toLowerCase()}-catalog@example.com`,
        fullName: 'Catalog User',
        passwordHash: await bcrypt.hash('Password123!', 12),
        role,
        hotel: {
          create: {
            name: 'Catalog Hotel',
            phoneNumber: '+15550000000',
            token: 'catalog-hotel',
          },
        },
      },
    });
    const { accessToken } = await authService.login(
      { email: user.email, password: 'Password123!' },
      {},
    );

    return {
      hotelId: user.hotelId!,
      headers: {
        authorization: `Bearer ${accessToken}`,
        origin: 'http://localhost:3000',
      },
    };
  }

  async function createConnectedOwner() {
    const owner = await createAuthorization();
    const config = app.get(ConfigService);

    await prisma.whatsAppAccount.create({
      data: {
        hotelId: owner.hotelId,
        wabaId: 'waba-id',
        phoneNumberId: 'phone-id',
        accessTokenEncrypted: encryptMetaToken(
          'meta-token',
          config.getOrThrow<string>('meta.tokenEncryptionKey'),
        ),
        status: 'CONNECTED',
      },
    });

    return owner;
  }

  it('returns the connected catalog and commerce settings', async () => {
    const { headers } = await createConnectedOwner();
    meta.getWabaCatalogs.mockResolvedValue([catalog]);
    meta.getCommerceSettings.mockResolvedValue({
      is_catalog_visible: true,
      is_cart_enabled: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/whatsapp/catalogs/connection',
      headers,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'connected',
      catalog: {
        id: 'catalog-id',
        name: 'Hotel catalog',
        vertical: 'commerce',
        productCount: 10,
      },
      catalogVisible: true,
      cartEnabled: false,
    });
    expect(meta.getWabaCatalogs).toHaveBeenCalledWith('waba-id', 'meta-token');
    expect(meta.getCommerceSettings).toHaveBeenCalledWith(
      'phone-id',
      'meta-token',
    );
  });

  it('requires an authenticated hotel owner', async () => {
    const unauthenticated = await app.inject({
      method: 'GET',
      url: '/api/whatsapp/catalogs/connection',
      headers: { origin: 'http://localhost:3000' },
    });
    const staff = await createAuthorization('STAFF');
    const forbidden = await app.inject({
      method: 'GET',
      url: '/api/whatsapp/catalogs/connection',
      headers: staff.headers,
    });

    expect(unauthenticated.statusCode).toBe(401);
    expect(forbidden.statusCode).toBe(403);
  });

  it('validates catalog request bodies', async () => {
    const { headers } = await createConnectedOwner();

    const connect = await app.inject({
      method: 'POST',
      url: '/api/whatsapp/catalogs/connect',
      headers,
      payload: { catalogId: '' },
    });
    const settings = await app.inject({
      method: 'PATCH',
      url: '/api/whatsapp/catalogs/settings',
      headers,
      payload: {},
    });

    expect(connect.statusCode).toBe(400);
    expect(settings.statusCode).toBe(400);
    expect(meta.connectCatalogToWaba).not.toHaveBeenCalled();
    expect(meta.updateCommerceSettings).not.toHaveBeenCalled();
  });

  it('lists the catalogs assigned to the Meta system user', async () => {
    const { headers } = await createConnectedOwner();
    meta.getSystemUserId.mockResolvedValue('system-user-id');
    meta.getAssignedCatalogs.mockResolvedValue([catalog]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/whatsapp/catalogs/available',
      headers,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      {
        id: 'catalog-id',
        name: 'Hotel catalog',
        vertical: 'commerce',
        productCount: 10,
      },
    ]);
    expect(meta.getAssignedCatalogs).toHaveBeenCalledWith(
      'system-user-id',
      'meta-token',
    );
  });

  it('connects a catalog and returns its connection state', async () => {
    const { headers } = await createConnectedOwner();
    meta.connectCatalogToWaba.mockResolvedValue(undefined);
    meta.getWabaCatalogs.mockResolvedValue([catalog]);
    meta.getCommerceSettings.mockResolvedValue({
      is_catalog_visible: true,
      is_cart_enabled: true,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/whatsapp/catalogs/connect',
      headers,
      payload: { catalogId: 'catalog-id' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ status: 'connected' });
    expect(meta.connectCatalogToWaba).toHaveBeenCalledWith(
      'waba-id',
      'catalog-id',
      'meta-token',
    );
  });

  it('updates catalog settings and returns the new connection state', async () => {
    const { headers } = await createConnectedOwner();
    meta.getWabaCatalogs.mockResolvedValue([catalog]);
    meta.updateCommerceSettings.mockResolvedValue(undefined);
    meta.getCommerceSettings.mockResolvedValue({
      is_catalog_visible: false,
      is_cart_enabled: true,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/whatsapp/catalogs/settings',
      headers,
      payload: { catalogVisible: false, cartEnabled: true },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'hidden',
      catalogVisible: false,
      cartEnabled: true,
    });
    expect(meta.updateCommerceSettings).toHaveBeenCalledWith(
      'phone-id',
      'meta-token',
      { catalogVisible: false, cartEnabled: true },
    );
  });

  it('disconnects a catalog and returns the disconnected state', async () => {
    const { headers } = await createConnectedOwner();
    meta.getWabaCatalogs
      .mockResolvedValueOnce([catalog])
      .mockResolvedValueOnce([]);
    meta.disconnectCatalogFromWaba.mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'POST',
      url: '/api/whatsapp/catalogs/disconnect',
      headers,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      status: 'not_connected',
      catalog: null,
      catalogVisible: false,
      cartEnabled: false,
    });
    expect(meta.disconnectCatalogFromWaba).toHaveBeenCalledWith(
      'waba-id',
      'catalog-id',
      'meta-token',
    );
  });
});
