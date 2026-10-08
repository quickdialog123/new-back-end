import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '@nestjs/http-client';
import type { MetaSendMessageResponse } from './meta.types.js';

@Injectable()
export class MetaGraphClient {
  constructor(
    private readonly http: HttpClient,
    private readonly config: ConfigService,
  ) {}

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
