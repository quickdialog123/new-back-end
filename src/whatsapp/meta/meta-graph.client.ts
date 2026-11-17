import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '@nestjs/http-client';
import type {
  MetaAccessTokenResponse,
  MetaAssignedCatalogsResponse,
  MetaClientBusinessResponse,
  MetaCommerceSettingsResponse,
  MetaPhoneNumbersResponse,
  MetaCatalogsResponse,
  MetaRegisterPhoneNumberResponse,
  MetaCatalogBatchStatus,
  MetaProductsResponse,
  MetaProductBatchRequest,
  MetaProductBatchResponse,
  MetaCatalog,
  MetaSuccessResponse,
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

  async getProductCatalogs(
    businessId: string,
    accessToken: string,
  ): Promise<MetaCatalog[]> {
    const version = this.config.getOrThrow<string>('meta.graphVersion');
    const catalogs = new Map<string, MetaCatalog>();

    for (const edge of ['owned_product_catalogs', 'client_product_catalogs']) {
      let after: string | undefined;
      do {
        const params = new URLSearchParams({
          fields: 'id,name,product_count',
          limit: '100',
        });
        if (after) params.set('after', after);
        const { data } = await this.http.get<MetaCatalogsResponse>(
          `/${version}/${encodeURIComponent(businessId)}/${edge}?${params}`,
          {
            headers: { authorization: `Bearer ${accessToken}` },
          },
        );
        for (const catalog of data.data ?? []) {
          catalogs.set(catalog.id, catalog);
        }
        after = data.paging?.cursors?.after;
      } while (after);
    }

    return [...catalogs.values()];
  }

  async getCatalogProducts(
    catalogId: string,
    accessToken: string,
    after?: string,
  ): Promise<MetaProductsResponse> {
    const version = this.config.getOrThrow<string>('meta.graphVersion');
    const params = new URLSearchParams({
      fields:
        'id,retailer_id,name,description,url,image_url,availability,price,currency,brand,condition',
      limit: '100',
    });
    if (after) params.set('after', after);
    const { data } = await this.http.get<MetaProductsResponse>(
      `/${version}/${encodeURIComponent(catalogId)}/products?${params}`,
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    return data;
  }

  async submitCatalogProductBatch(
    catalogId: string,
    accessToken: string,
    requests: MetaProductBatchRequest[],
  ): Promise<MetaProductBatchResponse> {
    const version = this.config.getOrThrow<string>('meta.graphVersion');
    const { data } = await this.http.post<MetaProductBatchResponse>(
      `/${version}/${encodeURIComponent(catalogId)}/items_batch`,
      {
        headers: { authorization: `Bearer ${accessToken}` },
        json: {
          item_type: 'PRODUCT_ITEM',
          allow_upsert: false,
          requests,
        },
      },
    );
    return data;
  }

  async getCatalogBatchStatus(
    catalogId: string,
    accessToken: string,
    handle: string,
  ): Promise<MetaCatalogBatchStatus> {
    const version = this.config.getOrThrow<string>('meta.graphVersion');
    const params = new URLSearchParams({
      handle,
      load_ids_of_invalid_requests: 'true',
      fields:
        'handle,status,warnings,errors_total_count,ids_of_invalid_requests',
    });
    const { data } = await this.http.get<{
      data: MetaCatalogBatchStatus[];
    }>(
      `/${version}/${encodeURIComponent(catalogId)}/check_batch_request_status?${params}`,
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    const status = data.data?.[0];
    if (!status) {
      throw new BadGatewayException('Meta returned no catalog batch status');
    }
    return status;
  }

  async connectCatalogToWaba(
    wabaId: string,
    catalogId: string,
    accessToken: string,
  ): Promise<void> {
    const params = new URLSearchParams({
      catalog_id: catalogId,
    });

    const { data } = await this.http.post<MetaSuccessResponse>(
      `/${this.version}/${wabaId}/product_catalogs?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!data.success) {
      throw new BadGatewayException({
        code: 'META_CATALOG_CONNECTION_FAILED',
        message: 'Meta did not confirm the catalog connection',
      });
    }
  }

  async getWabaCatalogs(
    wabaId: string,
    accessToken: string,
  ): Promise<MetaCatalogsResponse['data']> {
    const fields = ['id', 'name', 'vertical', 'product_count'].join(',');

    const { data } = await this.http.get<MetaCatalogsResponse>(
      `/${this.version}/${wabaId}/product_catalogs?fields=${fields}`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return data.data;
  }

  async getCommerceSettings(
    phoneNumberId: string,
    accessToken: string,
  ): Promise<MetaCommerceSettingsResponse['data'][number] | null> {
    const { data } = await this.http.get<MetaCommerceSettingsResponse>(
      `/${this.version}/${phoneNumberId}/whatsapp_commerce_settings`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return data.data[0] ?? null;
  }

  async updateCommerceSettings(
    phoneNumberId: string,
    accessToken: string,
    settings: {
      catalogVisible?: boolean;
      cartEnabled?: boolean;
    },
  ): Promise<void> {
    const params = new URLSearchParams();

    if (settings.catalogVisible !== undefined) {
      params.set('is_catalog_visible', String(settings.catalogVisible));
    }

    if (settings.cartEnabled !== undefined) {
      params.set('is_cart_enabled', String(settings.cartEnabled));
    }

    const { data } = await this.http.post<MetaSuccessResponse>(
      `/${this.version}/${phoneNumberId}/whatsapp_commerce_settings?${params.toString()}`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!data.success) {
      throw new Error('Meta did not update commerce settings');
    }
  }

  async getSystemUserId(accessToken: string): Promise<string> {
    const { data } = await this.http.get<{
      id: string;
    }>(`/${this.version}/me?fields=id`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    return data.id;
  }

  async getAssignedCatalogs(
    systemUserId: string,
    accessToken: string,
  ): Promise<MetaAssignedCatalogsResponse['data']> {
    const fields = ['id', 'name', 'vertical', 'product_count'].join(',');

    const { data } = await this.http.get<MetaAssignedCatalogsResponse>(
      `/${this.version}/${systemUserId}/assigned_product_catalogs?fields=${fields}`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return data.data;
  }

  async disconnectCatalogFromWaba(
    wabaId: string,
    catalogId: string,
    accessToken: string,
  ): Promise<void> {
    const params = new URLSearchParams({
      catalog_id: catalogId,
    });

    const { data } = await this.http.delete<MetaSuccessResponse>(
      `/${this.version}/${wabaId}/product_catalogs?${params.toString()}`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!data.success) {
      throw new Error('Meta did not disconnect the catalog');
    }
  }
}
