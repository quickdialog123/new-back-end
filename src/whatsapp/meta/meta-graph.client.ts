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
    const version = this.config.getOrThrow<string>('meta.graphVersion');
    const appId = this.config.getOrThrow<string>('meta.appId');
    const appSecret = this.config.getOrThrow<string>('meta.appSecret');
    const params = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      code,
    });
    try {
      const { data } = await this.http.get<MetaAccessTokenResponse>(
        `/${version}/oauth/access_token?${params.toString()}`,
      );

      return data.access_token;
    } catch (error) {
      this.handleRequestError(error);
    }
  }

  async getClientBusinessId(accessToken: string): Promise<string> {
    const version = this.config.getOrThrow<string>('meta.graphVersion');

    try {
      const { data } = await this.http.get<MetaClientBusinessResponse>(
        `/${version}/me?fields=client_business_id`,
        { headers: { authorization: `Bearer ${accessToken}` } },
      );

      return data.client_business_id;
    } catch (error) {
      this.handleRequestError(error);
    }
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
    const version = this.config.getOrThrow<string>('meta.graphVersion');

    try {
      const { data } = await this.http.get<MetaPhoneNumbersResponse>(
        `/${version}/${encodeURIComponent(wabaId)}/phone_numbers?fields=${fields}`,
        { headers: { authorization: `Bearer ${accessToken}` } },
      );

      return data.data;
    } catch (error) {
      this.handleRequestError(error);
    }
  }

  async registerPhoneNumber(
    phoneNumberId: string,
    accessToken: string,
    pin: string,
  ): Promise<void> {
    const version = this.config.getOrThrow<string>('meta.graphVersion');

    try {
      await this.http.post(
        `/${version}/${encodeURIComponent(phoneNumberId)}/register`,
        {
          headers: { authorization: `Bearer ${accessToken}` },
          json: {
            messaging_product: 'whatsapp',
            pin,
          },
        },
      );
    } catch (error) {
      this.handleRequestError(error);
    }
  }

  async subscribeApp(wabaId: string, accessToken: string): Promise<void> {
    const version = this.config.getOrThrow<string>('meta.graphVersion');

    try {
      await this.http.post(
        `/${version}/${encodeURIComponent(wabaId)}/subscribed_apps`,
        { headers: { authorization: `Bearer ${accessToken}` } },
      );
    } catch (error) {
      this.handleRequestError(error);
    }
  }

  private handleRequestError(error: unknown): never {
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
