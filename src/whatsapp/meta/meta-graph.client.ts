import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient, HttpResponseError } from '@nestjs/http-client';
import type {
  MetaAccessTokenResponse,
  MetaClientBusinessResponse,
  MetaPhoneNumbersResponse,
} from './meta.types.js';

@Injectable()
export class MetaGraphClient {
  private readonly logger = new Logger(MetaGraphClient.name);

  constructor(
    private readonly http: HttpClient,
    private readonly config: ConfigService,
  ) {}

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

    try {
      const url = `/${version}${path}`;
      const responseOptions = {
        headers,
        ...(options.body && { json: options.body }),
      };
      const response =
        options.method === 'POST'
          ? await this.http.post<T>(url, responseOptions)
          : await this.http.get<T>(url, responseOptions);

      return response.data;
    } catch (error) {
      if (error instanceof HttpResponseError) {
        const payload: unknown = error.body;
        let errorDetails: Record<string, unknown> = {};

        if (
          typeof payload === 'object' &&
          payload !== null &&
          'error' in payload &&
          typeof payload.error === 'object' &&
          payload.error !== null
        ) {
          const metaError = payload.error as Record<string, unknown>;
          errorDetails = {
            ...(typeof metaError.type === 'string' && {
              errorType: metaError.type,
            }),
            ...(typeof metaError.code === 'number' && {
              errorCode: metaError.code,
            }),
            ...(typeof metaError.error_subcode === 'number' && {
              errorSubcode: metaError.error_subcode,
            }),
          };
        }

        this.logger.warn('Meta WhatsApp API request failed', {
          status: error.status,
          ...errorDetails,
        });
        throw new BadGatewayException('Meta WhatsApp API request failed');
      }

      this.logger.warn('Unable to reach Meta WhatsApp API', {
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
      throw new BadGatewayException('Unable to reach Meta WhatsApp API');
    }
  }
}
