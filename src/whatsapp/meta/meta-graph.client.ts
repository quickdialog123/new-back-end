import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '@nestjs/http-client';
import type {
  MetaAccessTokenResponse,
  MetaClientBusinessResponse,
  MetaPhoneNumbersResponse,
  MetaSendMessageResponse,
} from './meta.types.js';

@Injectable()
export class MetaGraphClient {
  constructor(
    private readonly http: HttpClient,
    private readonly config: ConfigService,
  ) {}

  async exchangeCode(code: string): Promise<string> {
    const version = this.config.getOrThrow<string>('meta.graphVersion');
    const appId = this.config.getOrThrow<string>('meta.appId');
    const appSecret = this.config.getOrThrow<string>('meta.appSecret');

    const params = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      code,
    });

    const { data } = await this.http.get<MetaAccessTokenResponse>(
      `/${version}/oauth/access_token?${params.toString()}`,
    );

    return data.access_token;
  }

  async getClientBusinessId(accessToken: string): Promise<string> {
    const version = this.config.getOrThrow<string>('meta.graphVersion');

    const { data } = await this.http.get<MetaClientBusinessResponse>(
      `/${version}/me?fields=client_business_id`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return data.client_business_id;
  }

  async getPhoneNumbers(
    wabaId: string,
    accessToken: string,
  ): Promise<MetaPhoneNumbersResponse['data']> {
    const version = this.config.getOrThrow<string>('meta.graphVersion');

    const fields = [
      'id',
      'display_phone_number',
      'verified_name',
      'status',
      'code_verification_status',
      'name_status',
    ].join(',');

    const { data } = await this.http.get<MetaPhoneNumbersResponse>(
      `/${version}/${wabaId}/phone_numbers?fields=${fields}`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return data.data;
  }

  async subscribeApp(wabaId: string, accessToken: string): Promise<void> {
    const version = this.config.getOrThrow<string>('meta.graphVersion');

    await this.http.post(`/${version}/${wabaId}/subscribed_apps`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async sendText(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    message: string,
  ): Promise<MetaSendMessageResponse> {
    const version = this.config.getOrThrow<string>('meta.graphVersion');

    const { data } = await this.http.post<MetaSendMessageResponse>(
      `/${version}/${phoneNumberId}/messages`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        json: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: {
            body: message,
          },
        },
      },
    );

    return data;
  }
}
