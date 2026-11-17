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

export type MetaCatalog = {
  id: string;
  name: string;
  vertical?: string;
  product_count?: number;
};

export type MetaProduct = {
  id: string;
  retailer_id?: string;
  name?: string;
  description?: string;
  url?: string;
  image_url?: string;
  availability?: string;
  price?: string;
  currency?: string;
  brand?: string;
  condition?: string;
};

export type MetaProductBatchRequest = {
  method: 'CREATE' | 'UPDATE' | 'DELETE';
  data: Record<string, unknown>;
};

export type MetaProductBatchResponse = {
  handles?: string[];
  validation_status?: Array<{
    retailer_id: string;
    errors?: Array<{ message: string }>;
    warnings?: Array<{ message: string }>;
  }>;
};

export type MetaCatalogBatchStatus = {
  handle: string;
  status: string;
  errors_total_count?: number;
  errors?: Array<{ message: string }>;
  warnings?: Array<{ message: string }>;
  ids_of_invalid_requests?: string[];
};

export type MetaProductsResponse = {
  data: MetaProduct[];
  paging?: {
    cursors?: { before?: string; after?: string };
    next?: string;
  };
};

export type MetaCatalogsResponse = {
  data: MetaCatalog[];
  paging?: {
    cursors?: { before?: string; after?: string };
    next?: string;
  };
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

export type MetaAssignedCatalogsResponse = {
  data: MetaCatalog[];
};

export type MetaTemplate = {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: Array<Record<string, unknown>>;
  rejected_reason?: string;
};

export type MetaTemplateList = {
  data: MetaTemplate[];
  paging?: { cursors?: { after?: string }; next?: string };
};

export type MetaTemplateSubmission = {
  id: string;
  status: string;
  category: string;
};
