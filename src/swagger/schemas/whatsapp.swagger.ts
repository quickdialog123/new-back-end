export const whatsappStatusSwaggerSchema = {
  type: 'object',
  required: [
    'status',
    'wabaId',
    'phoneNumber',
    'displayName',
    'wabaStatus',
    'qualityRating',
    'connectedAt',
    'errorMessage',
  ],
  properties: {
    status: {
      type: 'string',
      enum: ['CONNECTED', 'NOT_CONNECTED', 'UNVERIFIED'],
      example: 'CONNECTED',
    },
    wabaId: { type: 'string', nullable: true, example: '123456789012345' },
    phoneNumber: { type: 'string', nullable: true, example: '+15551234567' },
    displayName: {
      type: 'string',
      nullable: true,
      example: 'QuickDialog Hotel',
    },
    wabaStatus: {
      type: 'string',
      enum: ['APPROVED', 'PENDING', 'RESTRICTED'],
      nullable: true,
      example: 'APPROVED',
    },
    qualityRating: {
      type: 'string',
      enum: ['GREEN', 'YELLOW', 'RED'],
      nullable: true,
      example: 'GREEN',
    },
    connectedAt: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: '2026-10-28T12:00:00.000Z',
    },
    errorMessage: { type: 'string', nullable: true, example: null },
  },
};

export const completeEmbeddedSignupRequestSwaggerSchema = {
  type: 'object',
  required: ['code', 'wabaId', 'phoneNumberId'],
  properties: {
    code: { type: 'string', minLength: 1, example: '<embedded-signup-code>' },
    wabaId: { type: 'string', minLength: 1, example: '123456789012345' },
    phoneNumberId: { type: 'string', minLength: 1, example: '987654321098765' },
  },
};

export const registerPhoneNumberSwaggerSchema = {
  type: 'object',
  required: ['pin'],
  properties: {
    pin: { type: 'string', pattern: '^\\d{6}$', example: '123456' },
  },
};

export const connectCatalogRequestSwaggerSchema = {
  type: 'object',
  required: ['catalogId'],
  properties: {
    catalogId: { type: 'string', minLength: 1, example: 'catalog-id' },
  },
};

export const updateCatalogSettingsRequestSwaggerSchema = {
  type: 'object',
  properties: {
    catalogVisible: { type: 'boolean' },
    cartEnabled: { type: 'boolean' },
  },
};

const catalogSwaggerSchema = {
  type: 'object',
  required: ['id', 'name', 'vertical', 'productCount'],
  properties: {
    id: { type: 'string', example: 'catalog-id' },
    name: { type: 'string', example: 'Hotel catalog' },
    vertical: { type: 'string', nullable: true },
    productCount: { type: 'number', example: 10 },
  },
};

export const catalogConnectionSwaggerSchema = {
  type: 'object',
  required: ['status', 'catalog', 'catalogVisible', 'cartEnabled'],
  properties: {
    status: {
      type: 'string',
      enum: ['connected', 'hidden', 'not_connected'],
    },
    catalog: { ...catalogSwaggerSchema, nullable: true },
    catalogVisible: { type: 'boolean' },
    cartEnabled: { type: 'boolean' },
  },
};

export const availableCatalogsSwaggerSchema = {
  type: 'array',
  items: catalogSwaggerSchema,
};
