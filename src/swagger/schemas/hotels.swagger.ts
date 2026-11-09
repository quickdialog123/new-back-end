export const hotelSwaggerSchema = {
  type: 'object',
  required: ['id', 'name', 'phoneNumber', 'active', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Grand Hotel' },
    phoneNumber: { type: 'string', example: '+1 555 123 4567' },
    active: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const createdHotelSwaggerSchema = {
  ...hotelSwaggerSchema,
  required: [...hotelSwaggerSchema.required, 'owner'],
  properties: {
    ...hotelSwaggerSchema.properties,
    owner: {
      type: 'object',
      required: ['id', 'email', 'fullName', 'role'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        fullName: { type: 'string' },
        role: { type: 'string', enum: ['OWNER'] },
      },
    },
  },
};

export const createHotelRequestSwaggerSchema = {
  type: 'object',
  required: ['name', 'phoneNumber', 'token', 'owner'],
  properties: {
    name: { type: 'string', example: 'Grand Hotel' },
    phoneNumber: { type: 'string', example: '+1 555 123 4567' },
    token: { type: 'string', example: 'grand-hotel' },
    owner: {
      type: 'object',
      required: ['email', 'fullName', 'password'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'owner@example.com',
        },
        fullName: { type: 'string', example: 'Hotel Owner' },
        password: { type: 'string', minLength: 8, example: 'Password123!' },
      },
    },
  },
};

export const updateHotelRequestSwaggerSchema = {
  type: 'object',
  minProperties: 1,
  properties: {
    name: { type: 'string', example: 'Grand Hotel Downtown' },
    phoneNumber: { type: 'string', example: '+1 555 987 6543' },
    token: { type: 'string', example: 'grand-hotel-downtown' },
  },
};
