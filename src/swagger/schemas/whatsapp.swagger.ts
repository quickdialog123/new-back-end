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
      enum: ['connected', 'not_connected', 'error'],
      example: 'connected',
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
