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
    expect(config.getOrThrow).toHaveBeenCalledTimes(3);
  });

  it('discovers owned and client catalogs for a business', async () => {
    get
      .mockResolvedValueOnce({
        data: { data: [{ id: 'owned', name: 'Owned' }] },
      })
      .mockResolvedValueOnce({
        data: { data: [{ id: 'client', name: 'Client' }] },
      });

    await expect(
      client.getProductCatalogs('business-id', 'access-token'),
    ).resolves.toEqual([
      { id: 'owned', name: 'Owned' },
      { id: 'client', name: 'Client' },
    ]);
    expect(get).toHaveBeenNthCalledWith(
      1,
      '/v26.0/business-id/owned_product_catalogs?fields=id%2Cname%2Cproduct_count&limit=100',
      { headers: { authorization: 'Bearer access-token' } },
    );
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/v26.0/business-id/client_product_catalogs?fields=id%2Cname%2Cproduct_count&limit=100',
      { headers: { authorization: 'Bearer access-token' } },
    );
  });

  it('lists catalog items with an optional cursor', async () => {
    get.mockResolvedValueOnce({ data: { data: [{ id: 'graph-id' }] } });

    await expect(
      client.getCatalogProducts('catalog-id', 'access-token', 'cursor'),
    ).resolves.toEqual({ data: [{ id: 'graph-id' }] });
    expect(get).toHaveBeenCalledWith(
      '/v26.0/catalog-id/products?fields=id%2Cretailer_id%2Cname%2Cdescription%2Curl%2Cimage_url%2Cavailability%2Cprice%2Ccurrency%2Cbrand%2Ccondition&limit=100&after=cursor',
      { headers: { authorization: 'Bearer access-token' } },
    );
  });

  it('submits product batch operations and reads their processing status', async () => {
    post.mockResolvedValueOnce({ data: { handles: ['batch-handle'] } });
    get.mockResolvedValueOnce({
      data: { data: [{ handle: 'batch-handle', status: 'finished' }] },
    });

    await client.submitCatalogProductBatch('catalog-id', 'access-token', [
      { method: 'DELETE', data: { id: 'retailer-id' } },
    ]);
    await expect(
      client.getCatalogBatchStatus(
        'catalog-id',
        'access-token',
        'batch-handle',
      ),
    ).resolves.toEqual({ handle: 'batch-handle', status: 'finished' });

    expect(post).toHaveBeenCalledWith('/v26.0/catalog-id/items_batch', {
      headers: { authorization: 'Bearer access-token' },
      json: {
        item_type: 'PRODUCT_ITEM',
        allow_upsert: false,
        requests: [{ method: 'DELETE', data: { id: 'retailer-id' } }],
      },
    });
    expect(get).toHaveBeenCalledWith(
      '/v26.0/catalog-id/check_batch_request_status?handle=batch-handle&load_ids_of_invalid_requests=true&fields=handle%2Cstatus%2Cwarnings%2Cerrors_total_count%2Cids_of_invalid_requests',
      { headers: { authorization: 'Bearer access-token' } },
    );
  });

  it('propagates Meta and network errors from catalog operations unchanged', async () => {
    const metaError = new HttpResponseError({
      method: 'GET',
      url: 'https://graph.facebook.com/v26.0/catalog-id/products',
      status: 400,
      body: {
        error: {
          message: 'Catalog permission denied',
          type: 'OAuthException',
          code: 200,
        },
      },
    });
    get.mockRejectedValueOnce(metaError);
    await expect(
      client.getCatalogProducts('catalog-id', 'access-token'),
    ).rejects.toBe(metaError);

    const networkError = new Error('network detail');
    get.mockRejectedValueOnce(networkError);
    await expect(
      client.getCatalogProducts('catalog-id', 'access-token'),
    ).rejects.toBe(networkError);
  });

  it('discovers owned and client catalogs for a business', async () => {
    get
      .mockResolvedValueOnce({
        data: { data: [{ id: 'owned', name: 'Owned' }] },
      })
      .mockResolvedValueOnce({
        data: { data: [{ id: 'client', name: 'Client' }] },
      });

    await expect(
      client.getProductCatalogs('business-id', 'access-token'),
    ).resolves.toEqual([
      { id: 'owned', name: 'Owned' },
      { id: 'client', name: 'Client' },
    ]);
    expect(get).toHaveBeenNthCalledWith(
      1,
      '/v26.0/business-id/owned_product_catalogs?fields=id%2Cname%2Cproduct_count&limit=100',
      { headers: { authorization: 'Bearer access-token' } },
    );
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/v26.0/business-id/client_product_catalogs?fields=id%2Cname%2Cproduct_count&limit=100',
      { headers: { authorization: 'Bearer access-token' } },
    );
  });

  it('lists catalog items with an optional cursor', async () => {
    get.mockResolvedValueOnce({ data: { data: [{ id: 'graph-id' }] } });

    await expect(
      client.getCatalogProducts('catalog-id', 'access-token', 'cursor'),
    ).resolves.toEqual({ data: [{ id: 'graph-id' }] });
    expect(get).toHaveBeenCalledWith(
      '/v26.0/catalog-id/products?fields=id%2Cretailer_id%2Cname%2Cdescription%2Curl%2Cimage_url%2Cavailability%2Cprice%2Ccurrency%2Cbrand%2Ccondition&limit=100&after=cursor',
      { headers: { authorization: 'Bearer access-token' } },
    );
  });

  it('submits product batch operations and reads their processing status', async () => {
    post.mockResolvedValueOnce({ data: { handles: ['batch-handle'] } });
    get.mockResolvedValueOnce({
      data: { data: [{ handle: 'batch-handle', status: 'finished' }] },
    });

    await client.submitCatalogProductBatch('catalog-id', 'access-token', [
      { method: 'DELETE', data: { id: 'retailer-id' } },
    ]);
    await expect(
      client.getCatalogBatchStatus(
        'catalog-id',
        'access-token',
        'batch-handle',
      ),
    ).resolves.toEqual({ handle: 'batch-handle', status: 'finished' });

    expect(post).toHaveBeenCalledWith('/v26.0/catalog-id/items_batch', {
      headers: { authorization: 'Bearer access-token' },
      json: {
        item_type: 'PRODUCT_ITEM',
        allow_upsert: false,
        requests: [{ method: 'DELETE', data: { id: 'retailer-id' } }],
      },
    });
    expect(get).toHaveBeenCalledWith(
      '/v26.0/catalog-id/check_batch_request_status?handle=batch-handle&load_ids_of_invalid_requests=true&fields=handle%2Cstatus%2Cwarnings%2Cerrors_total_count%2Cids_of_invalid_requests',
      { headers: { authorization: 'Bearer access-token' } },
    );
  });

  it('normalizes Meta and network errors for catalog operations', async () => {
    get.mockRejectedValueOnce(
      new HttpResponseError({
        method: 'GET',
        url: 'https://graph.facebook.com/v26.0/catalog-id/products',
        status: 400,
        body: {
          error: {
            message: 'Catalog permission denied',
            type: 'OAuthException',
            code: 200,
          },
        },
      }),
    );
    await expect(
      client.getCatalogProducts('catalog-id', 'access-token'),
    ).rejects.toBe(metaError);

    const networkError = new Error('network detail');
    get.mockRejectedValueOnce(networkError);
    await expect(
      client.getCatalogProducts('catalog-id', 'access-token'),
    ).rejects.toBe(networkError);
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
      { headers: { Authorization: 'Bearer access-token' } },
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

  it('propagates assigned catalog permission errors unchanged', async () => {
    const error = new HttpResponseError({
      method: 'GET',
      url: 'https://graph.facebook.com/v26.0/system-user-id/assigned_product_catalogs',
      status: 403,
      body: {
        error: {
          message: 'Permission denied',
          type: 'OAuthException',
          code: 200,
        },
      },
    });
    get.mockRejectedValueOnce(error);

    await expect(
      client.getAssignedCatalogs('system-user-id', 'access-token'),
    ).rejects.toBe(error);
  });

  it('propagates Meta connection response errors unchanged', async () => {
    const error = new HttpResponseError({
      method: 'POST',
      url: 'https://graph.facebook.com/v26.0/waba-id/product_catalogs',
      status: 400,
      body: { error: { message: 'Permission denied' } },
    });
    post.mockRejectedValueOnce(error);

    await expect(
      client.connectCatalogToWaba('waba-id', 'catalog-id', 'access-token'),
    ).rejects.toBe(error);
  });

  it('uploads template media as bytes and returns the Meta handle', async () => {
    post
      .mockResolvedValueOnce({ data: { id: 'upload:session?sig=signature' } })
      .mockResolvedValueOnce({ data: { h: 'media-handle' } });
    await expect(
      client.uploadTemplateMedia(
        'access-token',
        Buffer.from('image'),
        'header.png',
        'image/png',
      ),
    ).resolves.toBe('media-handle');
    expect(post).toHaveBeenNthCalledWith(1, '/v26.0/meta-app-id/uploads', {
      headers: { authorization: 'Bearer access-token' },
      query: {
        file_length: 5,
        file_type: 'image/png',
        file_name: 'header.png',
      },
    });
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/v26.0/upload:session?sig=signature',
      expect.objectContaining({
        headers: {
          authorization: 'Bearer access-token',
          file_offset: '0',
          'content-type': 'application/octet-stream',
        },
        body: expect.any(ArrayBuffer),
      }),
    );
  });
  it('paginates business catalogs and deduplicates shared catalog IDs', async () => {
    get
      .mockResolvedValueOnce({
        data: {
          data: [{ id: 'shared', name: 'Owned name' }],
          paging: { cursors: { after: 'next' } },
        },
      })
      .mockResolvedValueOnce({
        data: { data: [{ id: 'owned', name: 'Second page' }] },
      })
      .mockResolvedValueOnce({
        data: { data: [{ id: 'shared', name: 'Client name' }] },
      });

    await expect(
      client.getProductCatalogs('business-id', 'access-token'),
    ).resolves.toEqual([
      { id: 'shared', name: 'Client name' },
      { id: 'owned', name: 'Second page' },
    ]);
    expect(get).toHaveBeenCalledTimes(3);
    expect(get.mock.calls[1][0]).toContain('owned_product_catalogs?');
    expect(get.mock.calls[1][0]).toContain('&after=next');
    expect(get.mock.calls[2][0]).toContain('client_product_catalogs?');
  });

  it('lists catalog products without a cursor', async () => {
    get.mockResolvedValueOnce({ data: { data: [] } });

    await expect(
      client.getCatalogProducts('catalog-id', 'access-token'),
    ).resolves.toEqual({ data: [] });
    expect(get.mock.calls[0][0]).not.toContain('&after=');
  });

  it('rejects an empty catalog batch status response', async () => {
    get.mockResolvedValueOnce({ data: { data: [] } });

    await expect(
      client.getCatalogBatchStatus('catalog-id', 'access-token', 'handle'),
    ).rejects.toThrow('Meta returned no catalog batch status');
  });

  it('rejects a catalog connection that Meta does not confirm', async () => {
    post.mockResolvedValueOnce({ data: { success: false } });

    await expect(
      client.connectCatalogToWaba('waba-id', 'catalog-id', 'access-token'),
    ).rejects.toMatchObject({
      response: {
        code: 'META_CATALOG_CONNECTION_FAILED',
        message: 'Meta did not confirm the catalog connection',
      },
    });
  });

  it('updates the cart setting without changing catalog visibility', async () => {
    post.mockResolvedValueOnce({ data: { success: true } });

    await expect(
      client.updateCommerceSettings('phone-id', 'access-token', {
        cartEnabled: true,
      }),
    ).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith(
      '/v26.0/phone-id/whatsapp_commerce_settings?is_cart_enabled=true',
      { headers: { authorization: 'Bearer access-token' } },
    );
  });

  it('rejects commerce settings updates that Meta does not confirm', async () => {
    post.mockResolvedValueOnce({ data: { success: false } });

    await expect(
      client.updateCommerceSettings('phone-id', 'access-token', {
        cartEnabled: false,
      }),
    ).rejects.toThrow('Meta did not update commerce settings');
  });

  it('rejects catalog disconnections that Meta does not confirm', async () => {
    remove.mockResolvedValueOnce({ data: { success: false } });

    await expect(
      client.disconnectCatalogFromWaba('waba-id', 'catalog-id', 'access-token'),
    ).rejects.toThrow('Meta did not disconnect the catalog');
  });
});
