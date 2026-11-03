import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { HttpClient } from '@nestjs/http-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MetaGraphClient } from '@quickdialog/whatsapp/meta/meta-graph.client.js';

describe('MetaGraphClient', () => {
  let client: MetaGraphClient;
  const http = { get: vi.fn(), post: vi.fn() };
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
    http.get.mockResolvedValue({ data: { access_token: 'meta-access-token' } });

    await expect(client.exchangeCode('code with spaces')).resolves.toBe(
      'meta-access-token',
    );
    expect(http.get).toHaveBeenCalledWith(
      '/v26.0/oauth/access_token?client_id=meta-app-id&client_secret=meta-app-secret&code=code+with+spaces',
    );
  });

  it('gets the client business ID and phone numbers with bearer authorization', async () => {
    http.get
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
    expect(http.get).toHaveBeenNthCalledWith(
      1,
      '/v26.0/me?fields=client_business_id',
      { headers: { authorization: 'Bearer access-token' } },
    );
    expect(http.get).toHaveBeenNthCalledWith(
      2,
      '/v26.0/waba-id/phone_numbers?fields=id,display_phone_number,verified_name,status,code_verification_status,name_status',
      { headers: { authorization: 'Bearer access-token' } },
    );
  });

  it('subscribes the app and propagates Meta errors', async () => {
    http.post.mockResolvedValue({});

    await expect(client.subscribeApp('waba-id', 'access-token')).resolves.toBe(
      undefined,
    );
    expect(http.post).toHaveBeenCalledWith('/v26.0/waba-id/subscribed_apps', {
      headers: { authorization: 'Bearer access-token' },
    });

    http.get.mockRejectedValueOnce(new Error('Meta unavailable'));
    await expect(client.exchangeCode('code')).rejects.toThrow(
      'Meta unavailable',
    );
  });
});
