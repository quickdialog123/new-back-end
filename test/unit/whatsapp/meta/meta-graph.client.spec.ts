import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MetaGraphClient } from '@quickdialog/whatsapp/meta/meta-graph.client.js';

describe('MetaGraphClient', () => {
  let client: MetaGraphClient;
  const fetchMock = vi.fn();
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
    vi.stubGlobal('fetch', fetchMock);
    const moduleRef = await Test.createTestingModule({
      providers: [
        MetaGraphClient,
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    client = moduleRef.get(MetaGraphClient);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function jsonResponse(data: unknown, ok = true, status = 200) {
    return {
      ok,
      status,
      json: vi.fn().mockResolvedValue(data),
    };
  }

  it('exchanges a signup code for an access token', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ access_token: 'meta-access-token' }),
    );

    await expect(client.exchangeCode('code with spaces')).resolves.toBe(
      'meta-access-token',
    );
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://graph.facebook.com/v26.0/oauth/access_token?client_id=meta-app-id&client_secret=meta-app-secret&code=code+with+spaces',
    );
  });

  it('gets the client business ID and phone numbers with bearer authorization', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ client_business_id: 'business-id' }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: 'phone-id',
              display_phone_number: '+15551234567',
              verified_name: 'QuickDialog Hotel',
            },
          ],
        }),
      );

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
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://graph.facebook.com/v26.0/me?fields=client_business_id',
      expect.objectContaining({
        headers: { authorization: 'Bearer access-token' },
        signal: expect.any(AbortSignal),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://graph.facebook.com/v26.0/waba-id/phone_numbers?fields=id,display_phone_number,verified_name,status,code_verification_status,name_status',
      expect.objectContaining({
        headers: { authorization: 'Bearer access-token' },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('registers a phone with the six-digit WhatsApp PIN', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

    await client.registerPhoneNumber('phone-id', 'access-token', '654321');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://graph.facebook.com/v26.0/phone-id/register',
      expect.objectContaining({
        method: 'POST',
        headers: {
          authorization: 'Bearer access-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          pin: '654321',
        }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('encodes Meta asset IDs as single path segments', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true }));

    await client.registerPhoneNumber(
      'phone/id?unexpected=query', 'access-token', '123456',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.facebook.com/v26.0/phone%2Fid%3Funexpected%3Dquery/register',
      expect.any(Object),
    );
  });

  it('does not expose Meta response details when the Graph API rejects a call', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            message: 'secret provider details',
            type: 'OAuthException',
            code: 190,
            error_subcode: 458,
          },
        },
        false,
        400,
      ),
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
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

    await expect(client.subscribeApp('waba-id', 'access-token')).resolves.toBe(
      undefined,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.facebook.com/v26.0/waba-id/subscribed_apps',
      expect.objectContaining({
        method: 'POST',
        headers: { authorization: 'Bearer access-token' },
        signal: expect.any(AbortSignal),
      }),
    );

    fetchMock.mockRejectedValueOnce(new Error('network details'));
    await expect(client.exchangeCode('code')).rejects.toThrow(
      'Unable to reach Meta WhatsApp API',
    );
  });
});
