import { WhatsAppAccountStatus } from '@quickdialog/generated/prisma/enums.js';

export type MetaAccessTokenResponse = {
  access_token: string;
  token_type?: string;
};

export type MetaClientBusinessResponse = {
  client_business_id: string;
};

export type MetaPhoneNumber = {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  status?: string;
  code_verification_status?: string;
  name_status?: string;
};

export type MetaPhoneNumbersResponse = {
  data: MetaPhoneNumber[];
};

export type MetaSendMessageResponse = {
  messaging_product: string;
  contacts?: Array<{
    input: string;
    wa_id: string;
  }>;
  messages?: Array<{
    id: string;
  }>;
};

export type MetaRegisterPhoneNumberResponse = { success: boolean };

export type MetaProductCatalog = {
  id: string;
  name: string;
  vertical?: string;
  product_count?: number;
};

export type MetaProductCatalogsResponse = {
  data: MetaProductCatalog[];
};

export type MetaCreateCatalogResponse = {
  id: string;
};

export type MetaSuccessResponse = {
  success: boolean;
};

export type MetaCommerceSetting = {
  id: string;
  is_cart_enabled: boolean;
  is_catalog_visible: boolean;
};

export type MetaCommerceSettingsResponse = {
  data: MetaCommerceSetting[];
};
