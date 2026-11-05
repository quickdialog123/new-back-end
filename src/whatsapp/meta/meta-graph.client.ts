import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '@nestjs/http-client';
import type {
  MetaAccessTokenResponse,
  MetaClientBusinessResponse,
  MetaPhoneNumbersResponse,
  MetaRegisterPhoneNumberResponse,
} from './meta.types.js';

@Injectable()
export class MetaGraphClient {
  private readonly version: string;
  private readonly appId: string;
  private readonly appSecret: string;

  constructor(
    private readonly http: HttpClient,
    private readonly config: ConfigService,
  ) {
    this.version = this.config.getOrThrow<string>('meta.graphVersion');
    this.appId = this.config.getOrThrow<string>('meta.appId');
    this.appSecret = this.config.getOrThrow<string>('meta.appSecret');
  }

  async exchangeCode(code: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      code,
    });

    const { data } = await this.http.get<MetaAccessTokenResponse>(
      `/${this.version}/oauth/access_token?${params.toString()}`,
    );

    return data.access_token;
  }

  async getClientBusinessId(accessToken: string): Promise<string> {
    const { data } = await this.http.get<MetaClientBusinessResponse>(
      `/${this.version}/me?fields=client_business_id`,
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
    const fields = [
      'id',
      'display_phone_number',
      'verified_name',
      'status',
      'code_verification_status',
      'name_status',
    ].join(',');

    const { data } = await this.http.get<MetaPhoneNumbersResponse>(
      `/${this.version}/${wabaId}/phone_numbers?fields=${fields}`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return data.data;
  }

  async subscribeApp(wabaId: string, accessToken: string): Promise<void> {
    await this.http.post(`/${this.version}/${wabaId}/subscribed_apps`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async registerPhoneNumber(
    phoneNumberId: string,
    accessToken: string,
    pin: string,
  ): Promise<MetaRegisterPhoneNumberResponse> {
    const version = this.config.getOrThrow<string>('meta.graphVersion');

    const { data } = await this.http.post<MetaRegisterPhoneNumberResponse>(
      `/${version}/${encodeURIComponent(phoneNumberId)}/register`,
      {
        headers: { authorization: `Bearer ${accessToken}` },
        json: {
          messaging_product: 'whatsapp',
          pin,
        },
      },
    );

    return data;
  }

  async getProductcatalogs(wabaId: string, accessToken: string) {
    const { data: S } = await this.http.get<any>(
      `/${this.version}/me/permissions`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );
    console.log(S);
    const { data } = await this.http.get<any>(
      `/${this.version}/${wabaId}/product_catalogs`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    console.log(data);

    return '';
  }
}
