import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient, HttpResponseError } from '@nestjs/http-client';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MetaGraphClient } from '@quickdialog/whatsapp/meta/meta-graph.client.js';

describe('MetaGraphClient', () => {
  let client: MetaGraphClient;
  const get = vi.fn();
  const post = vi.fn();
  const http = { get, post };
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

    expect(post).toHaveBeenNthCalledWith(
      1,
      '/v26.0/phone-id/register',
      {
        headers: {
          authorization: 'Bearer access-token',
        },
        json: {
          messaging_product: 'whatsapp',
          pin: '654321',
        },
      },
    );
  });

  it('encodes Meta asset IDs as single path segments', async () => {
    post.mockResolvedValue({ data: { success: true } });

    await client.registerPhoneNumber(
      'phone/id?unexpected=query', 'access-token', '123456',
    );

    expect(post).toHaveBeenCalledWith(
      '/v26.0/phone%2Fid%3Funexpected%3Dquery/register',
      expect.any(Object),
    );
  });

  it('does not expose Meta response details when the Graph API rejects a call', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    post.mockRejectedValue(
      new HttpResponseError({
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
      }),
    );

    await expect(
      client.registerPhoneNumber('phone-id', 'token', '123456'),
    ).rejects.toThrow('Meta WhatsApp API request failed');
    expect(warn).toHaveBeenCalledWith(
      'Meta WhatsApp API request failed',
      expect.objectContaining({
        status: 400,
        errorType: 'OAuthException',
        errorCode: 190,
        errorSubcode: 458,
      }),
    );
    expect(warn.mock.calls.flat().join(' ')).not.toContain(
      'secret provider details',
    );
  });

  it('subscribes the app and propagates Meta errors', async () => {
    post.mockResolvedValueOnce({ data: { success: true } });

    await expect(client.subscribeApp('waba-id', 'access-token')).resolves.toBe(
      undefined,
    );
    expect(post).toHaveBeenCalledWith(
      '/v26.0/waba-id/subscribed_apps',
      { headers: { authorization: 'Bearer access-token' } },
    );

    get.mockRejectedValueOnce(new Error('network details'));
    await expect(client.exchangeCode('code')).rejects.toThrow(
      'Unable to reach Meta WhatsApp API',
    );
  });
});
