export type MetaWebhookMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;

  text?: {
    body: string;
  };
};

export type MetaWebhookStatus = {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;

  errors?: Array<{
    code: number;
    title?: string;
    message?: string;

    error_data?: {
      details?: string;
    };
  }>;
};

export type MetaWebhookValue = {
  messaging_product?: string;

  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };

  contacts?: Array<{
    wa_id: string;

    profile?: {
      name?: string;
    };
  }>;

  messages?: MetaWebhookMessage[];

  statuses?: MetaWebhookStatus[];
};

export type MetaWebhookPayload = {
  object: string;

  entry?: Array<{
    id: string;

    changes?: Array<{
      field: string;
      value: MetaWebhookValue;
    }>;
  }>;
};
