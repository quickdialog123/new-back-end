import { ConfigService } from '@nestjs/config';
import { HttpClient, HttpResponseError } from '@nestjs/http-client';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MetaGraphClient } from '@quickdialog/whatsapp/meta/meta-graph.client.js';

describe('MetaGraphClient', () => {
  let client: MetaGraphClient;
  const get = vi.fn();
  const post = vi.fn();
  const remove = vi.fn();
  const http = { get, post, delete: remove };
  const config = {
    getOrThrow: vi.fn(
      (key: string) =>
        ({
          'meta.graphVersion': 'v26.0',
          'meta.appId': 'meta-app-id',
          'meta.appSecret': 'meta-app-secret',
        })[key],
    ),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        MetaGraphClient,
        { provide: HttpClient, useValue: http },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    client = moduleRef.get(MetaGraphClient);
  });

  it('exchanges a signup code for an access token', async () => {
    get.mockResolvedValue({ data: { access_token: 'meta-access-token' } });

    await expect(client.exchangeCode('code with spaces')).resolves.toBe(
      'meta-access-token',
    );
    expect(get).toHaveBeenCalledWith(
      '/v26.0/oauth/access_token?client_id=meta-app-id&client_secret=meta-app-secret&code=code+with+spaces',
    );
  });

  it('gets the client business ID and phone numbers with bearer authorization', async () => {
    get
      .mockResolvedValueOnce({ data: { client_business_id: 'business-id' } })
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'phone-id',
              display_phone_number: '+15551234567',
              verified_name: 'QuickDialog Hotel',
            },
          ],
        },
      });

    await expect(client.getClientBusinessId('access-token')).resolves.toBe(
      'business-id',
    );
    await expect(
      client.getPhoneNumbers('waba-id', 'access-token'),
    ).resolves.toEqual([
      {
        id: 'phone-id',
        display_phone_number: '+15551234567',
        verified_name: 'QuickDialog Hotel',
      },
    ]);
    expect(get).toHaveBeenNthCalledWith(
      1,
      '/v26.0/me?fields=client_business_id',
      { headers: { authorization: 'Bearer access-token' } },
    );
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/v26.0/waba-id/phone_numbers?fields=id,display_phone_number,verified_name,status,code_verification_status,name_status',
      { headers: { authorization: 'Bearer access-token' } },
    );
  });

  it('registers a phone with the six-digit WhatsApp PIN', async () => {
    post.mockResolvedValueOnce({ data: { success: true } });

    await client.registerPhoneNumber('phone-id', 'access-token', '654321');

    expect(post).toHaveBeenNthCalledWith(1, '/v26.0/phone-id/register', {
      headers: {
        authorization: 'Bearer access-token',
      },
      json: {
        messaging_product: 'whatsapp',
        pin: '654321',
      },
    });
  });

  it('encodes Meta asset IDs as single path segments', async () => {
    post.mockResolvedValue({ data: { success: true } });

    await client.registerPhoneNumber(
      'phone/id?unexpected=query',
      'access-token',
      '123456',
    );

    expect(post).toHaveBeenCalledWith(
      '/v26.0/phone%2Fid%3Funexpected%3Dquery/register',
      expect.any(Object),
    );
  });

  it('propagates Graph API response errors', async () => {
    const error = new HttpResponseError({
      method: 'POST',
      url: 'https://graph.facebook.com/v26.0/phone-id/register',
      status: 400,
      body: {
        error: {
          message: 'secret provider details',
          type: 'OAuthException',
          code: 190,
          error_subcode: 458,
        },
      },
    });
    post.mockRejectedValue(error);

    await expect(
      client.registerPhoneNumber('phone-id', 'token', '123456'),
    ).rejects.toBe(error);
  });

  it('subscribes the app and propagates transport errors', async () => {
    post.mockResolvedValueOnce({ data: { success: true } });

    await expect(client.subscribeApp('waba-id', 'access-token')).resolves.toBe(
      undefined,
    );
    expect(post).toHaveBeenCalledWith('/v26.0/waba-id/subscribed_apps', {
      headers: { authorization: 'Bearer access-token' },
    });

    const error = new Error('network details');
    get.mockRejectedValueOnce(error);
    await expect(client.exchangeCode('code')).rejects.toBe(error);
  });

  it('connects and lists WhatsApp product catalogs', async () => {
    post.mockResolvedValue({ data: { success: true } });
    get.mockResolvedValue({
      data: {
        data: [
          {
            id: 'catalog-id',
            name: 'Hotel catalog',
            vertical: 'commerce',
            product_count: 10,
          },
        ],
      },
    });

    await expect(
      client.connectCatalogToWaba('waba-id', 'catalog id', 'access-token'),
    ).resolves.toBeUndefined();
    await expect(
      client.getWabaCatalogs('waba-id', 'access-token'),
    ).resolves.toEqual([
      {
        id: 'catalog-id',
        name: 'Hotel catalog',
        vertical: 'commerce',
        product_count: 10,
      },
    ]);

    expect(post).toHaveBeenCalledWith(
      '/v26.0/waba-id/product_catalogs?catalog_id=catalog+id',
      { headers: { authorization: 'Bearer access-token' } },
    );
    expect(get).toHaveBeenCalledWith(
      '/v26.0/waba-id/product_catalogs?fields=id,name,vertical,product_count',
      { headers: { authorization: 'Bearer access-token' } },
    );
  });

  it('gets and updates commerce settings', async () => {
    get
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'setting-id',
              is_catalog_visible: true,
              is_cart_enabled: false,
            },
          ],
        },
      })
      .mockResolvedValueOnce({ data: { data: [] } });
    post.mockResolvedValue({ data: { success: true } });

    await expect(
      client.getCommerceSettings('phone-id', 'access-token'),
    ).resolves.toMatchObject({ is_catalog_visible: true });
    await expect(
      client.getCommerceSettings('phone-id', 'access-token'),
    ).resolves.toBeNull();
    await expect(
      client.updateCommerceSettings('phone-id', 'access-token', {
        catalogVisible: true,
      }),
    ).resolves.toBeUndefined();

    expect(post).toHaveBeenCalledWith(
      '/v26.0/phone-id/whatsapp_commerce_settings?is_catalog_visible=true',
      { headers: { authorization: 'Bearer access-token' } },
    );
  });

  it('gets assigned catalogs and disconnects an existing catalog', async () => {
    get
      .mockResolvedValueOnce({ data: { id: 'system-user-id' } })
      .mockResolvedValueOnce({ data: { data: [{ id: 'catalog-id' }] } });
    remove.mockResolvedValue({ data: { success: true } });

    await expect(client.getSystemUserId('access-token')).resolves.toBe(
      'system-user-id',
    );
    await expect(
      client.getAssignedCatalogs('system-user-id', 'access-token'),
    ).resolves.toEqual([{ id: 'catalog-id' }]);
    await expect(
      client.disconnectCatalogFromWaba('waba-id', 'catalog id', 'access-token'),
    ).resolves.toBeUndefined();

    expect(get).toHaveBeenNthCalledWith(1, '/v26.0/me?fields=id', {
      headers: { authorization: 'Bearer access-token' },
    });
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/v26.0/system-user-id/assigned_product_catalogs?fields=id,name,vertical,product_count',
      { headers: { authorization: 'Bearer access-token' } },
    );
    expect(remove).toHaveBeenCalledWith(
      '/v26.0/waba-id/product_catalogs?catalog_id=catalog+id',
      { headers: { authorization: 'Bearer access-token' } },
    );
  });
});
