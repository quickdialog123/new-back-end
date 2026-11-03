import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  MetaAccessTokenResponse,
  MetaClientBusinessResponse,
  MetaPhoneNumbersResponse,
} from './meta.types.js';

type PhoneVerificationMethod = 'SMS' | 'VOICE';

@Injectable()
export class MetaGraphClient {
  constructor(private readonly config: ConfigService) {}

  async exchangeCode(code: string): Promise<string> {
    const appId = this.config.getOrThrow<string>('meta.appId');
    const appSecret = this.config.getOrThrow<string>('meta.appSecret');
    const params = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      code,
    });
    const data = await this.request<MetaAccessTokenResponse>(
      `/oauth/access_token?${params.toString()}`,
    );

    return data.access_token;
  }

  async getClientBusinessId(accessToken: string): Promise<string> {
    const data = await this.request<MetaClientBusinessResponse>(
      '/me?fields=client_business_id',
      { accessToken },
    );

    return data.client_business_id;
  }

  async getPhoneNumbers(
    wabaId: string,
    accessToken: string,
  ): Promise<MetaPhoneNumbersResponse['data']> {
    const fields = [
      'id',
      'display_phone_number',
      'verified_name',
      'status',
      'code_verification_status',
      'name_status',
    ].join(',');
    const data = await this.request<MetaPhoneNumbersResponse>(
      `/${encodeURIComponent(wabaId)}/phone_numbers?fields=${fields}`,
      { accessToken },
    );

    return data.data;
  }

  async requestPhoneVerificationCode(
    phoneNumberId: string,
    accessToken: string,
    method: PhoneVerificationMethod,
  ): Promise<void> {
    await this.request(`/${encodeURIComponent(phoneNumberId)}/request_code`, {
      method: 'POST',
      accessToken,
      body: { code_method: method, language: 'en_US' },
    });
  }

  async verifyPhoneNumberCode(
    phoneNumberId: string,
    accessToken: string,
    code: string,
  ): Promise<void> {
    await this.request(`/${encodeURIComponent(phoneNumberId)}/verify_code`, {
      method: 'POST',
      accessToken,
      body: { code },
    });
  }

  async registerPhoneNumber(
    phoneNumberId: string,
    accessToken: string,
    pin: string,
  ): Promise<void> {
    await this.request(`/${encodeURIComponent(phoneNumberId)}/register`, {
      method: 'POST',
      accessToken,
      body: {
        messaging_product: 'whatsapp',
        pin,
      },
    });
  }

  async subscribeApp(wabaId: string, accessToken: string): Promise<void> {
    await this.request(`/${encodeURIComponent(wabaId)}/subscribed_apps`, {
      method: 'POST',
      accessToken,
    });
  }

  private async request<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST';
      accessToken?: string;
      body?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const version = this.config.getOrThrow<string>('meta.graphVersion');
    const headers: Record<string, string> = {};

    if (options.accessToken) {
      headers.authorization = `Bearer ${options.accessToken}`;
    }

    if (options.body) {
      headers['content-type'] = 'application/json';
    }

    let response: Response;

    try {
      response = await fetch(`https://graph.facebook.com/${version}${path}`, {
        method: options.method,
        headers,
        signal: AbortSignal.timeout(10_000),
        ...(options.body && { body: JSON.stringify(options.body) }),
      });
    } catch {
      throw new BadGatewayException('Unable to reach Meta WhatsApp API');
    }

    if (!response.ok) {
      throw new BadGatewayException('Meta WhatsApp API request failed');
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new BadGatewayException(
        'Meta WhatsApp API returned an invalid response',
      );
    }
  }
}
