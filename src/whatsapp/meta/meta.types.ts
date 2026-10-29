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
