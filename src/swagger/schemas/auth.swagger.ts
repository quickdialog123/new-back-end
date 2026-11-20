export const loginRequestSwaggerSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      example: 'staff@example.com',
    },
    password: {
      type: 'string',
      minLength: 1,
      example: 'Password123!',
    },
  },
};

export const accessTokenSwaggerSchema = {
  type: 'object',
  required: ['accessToken'],
  properties: {
    accessToken: {
      type: 'string',
      example: '<access-token>',
    },
  },
};

export const authenticatedUserSwaggerSchema = {
  type: 'object',
  required: ['userId', 'sessionId', 'hotelId', 'role'],
  properties: {
    userId: {
      type: 'string',
      format: 'uuid',
      example: '4e3ee6a0-eec9-47c8-9fe3-e92afe8a2b1b',
    },
    sessionId: {
      type: 'string',
      format: 'uuid',
      example: '8d234fad-ceec-4f64-bb1b-1459c0b16cd7',
    },
    hotelId: {
      type: 'string',
      format: 'uuid',
      nullable: true,
      example: null,
    },
    role: {
      type: 'string',
      enum: ['OWNER', 'STAFF', 'SUPER_ADMIN'],
      example: 'OWNER',
    },
  },
};
