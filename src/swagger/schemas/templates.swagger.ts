const templateButtonSchema = {
  type: 'object',
  required: ['type', 'text'],
  properties: {
    type: {
      type: 'string',
      enum: ['QUICK_REPLY', 'URL', 'PHONE_NUMBER', 'CATALOG'],
    },
    text: { type: 'string' },
    url: { type: 'string', format: 'uri' },
    phoneNumber: { type: 'string' },
  },
};

const templateHeaderSchema = {
  oneOf: [
    {
      type: 'object',
      required: ['type', 'text'],
      properties: {
        type: { type: 'string', enum: ['TEXT'] },
        text: { type: 'string', maxLength: 60 },
      },
    },
    {
      type: 'object',
      required: ['type', 'mediaHandle'],
      properties: {
        type: { type: 'string', enum: ['IMAGE', 'VIDEO', 'DOCUMENT'] },
        mediaSample: { type: 'string', maxLength: 128 },
        mediaHandle: { type: 'string' },
      },
    },
  ],
};

export const templateRequestSwaggerSchema = {
  type: 'object',
  required: [
    'name',
    'category',
    'language',
    'header',
    'body',
    'footer',
    'buttons',
  ],
  properties: {
    name: { type: 'string', pattern: '^[a-z0-9_]+$' },
    category: {
      type: 'string',
      enum: ['MARKETING', 'UTILITY', 'AUTHENTICATION'],
    },
    language: { type: 'string', example: 'en_US' },
    header: { oneOf: [...templateHeaderSchema.oneOf], nullable: true },
    body: { type: 'string', maxLength: 1024 },
    footer: { type: 'string', nullable: true, maxLength: 60 },
    buttons: { type: 'array', maxItems: 3, items: templateButtonSchema },
    sampleValues: { type: 'object', additionalProperties: { type: 'string' } },
  },
};

export const templateResponseSwaggerSchema = {
  type: 'object',
  required: [
    'id',
    'name',
    'category',
    'language',
    'header',
    'body',
    'footer',
    'buttons',
    'status',
    'broadcastEligible',
  ],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    category: { type: 'string' },
    language: { type: 'string' },
    header: { type: 'object', nullable: true },
    body: { type: 'string' },
    footer: { type: 'string', nullable: true },
    buttons: { type: 'array', items: templateButtonSchema },
    status: { type: 'string' },
    broadcastEligible: { type: 'boolean' },
    rejectionReason: { type: 'string' },
  },
};

export const templateListResponseSwaggerSchema = {
  type: 'object',
  required: ['data', 'paging'],
  properties: {
    data: { type: 'array', items: templateResponseSwaggerSchema },
    paging: {
      type: 'object',
      required: ['after'],
      properties: { after: { type: 'string', nullable: true } },
    },
  },
};

export const templateMediaResponseSwaggerSchema = {
  type: 'object',
  required: ['mediaHandle'],
  properties: { mediaHandle: { type: 'string' } },
};
