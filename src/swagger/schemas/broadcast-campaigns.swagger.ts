export const broadcastCampaignRequestSwaggerSchema = {
  type: 'object',
  required: ['name', 'templateName', 'templateLanguage'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 120 },
    templateName: { type: 'string', example: 'summer_offer' },
    templateLanguage: { type: 'string', example: 'en_US' },
    guestIds: {
      type: 'array',
      maxItems: 500,
      uniqueItems: true,
      items: { type: 'string', format: 'uuid' },
    },
    productRetailerIds: {
      type: 'array',
      maxItems: 100,
      uniqueItems: true,
      items: { type: 'string', minLength: 1, maxLength: 100 },
      description:
        'Ordered Meta catalog retailer IDs; array order defines position.',
    },
  },
};

export const updateBroadcastCampaignRequestSwaggerSchema = {
  type: 'object',
  minProperties: 1,
  properties: broadcastCampaignRequestSwaggerSchema.properties,
};

export const broadcastCampaignResponseSwaggerSchema = {
  type: 'object',
  required: [
    'id',
    'hotelId',
    'name',
    'templateName',
    'templateLanguage',
    'productRetailerIds',
    'status',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    hotelId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    templateName: { type: 'string' },
    templateLanguage: { type: 'string' },
    productRetailerIds: {
      type: 'array',
      uniqueItems: true,
      items: { type: 'string' },
    },
    status: {
      type: 'string',
      enum: ['DRAFT', 'SENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    guestCount: { type: 'integer' },
    productCount: { type: 'integer' },
    guests: {
      type: 'array',
      items: {
        type: 'object',
        required: ['status', 'guest'],
        properties: {
          status: {
            type: 'string',
            enum: ['PENDING', 'RECEIVED', 'FAILED'],
            nullable: true,
          },
          guest: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              email: { type: 'string', nullable: true },
              phoneNumber: { type: 'string' },
              roomNumber: { type: 'integer' },
            },
          },
        },
      },
    },
  },
};

export const broadcastCampaignPreviewSwaggerSchema = {
  type: 'object',
  required: ['campaignId', 'template'],
  properties: {
    campaignId: { type: 'string', format: 'uuid' },
    template: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        language: { type: 'string' },
        category: { type: 'string' },
        status: { type: 'string' },
        components: { type: 'array', items: { type: 'object' } },
      },
    },
  },
};
