const guestRequestProperties = {
  firstName: { type: 'string', example: 'Sam' },
  lastName: { type: 'string', example: 'Guest' },
  email: { type: 'string', format: 'email', example: 'sam@example.com' },
  phoneNumber: { type: 'string', example: '+1 555 010 0000' },
  marketingConsent: { type: 'boolean', default: false, example: false },
  address: { type: 'string', example: '42 Example Street' },
  checkInDate: { type: 'string', format: 'date', example: '2026-11-19' },
  checkOutDate: { type: 'string', format: 'date', example: '2026-11-20' },
  roomNumber: { type: 'integer', example: 101 },
  floorNumber: { type: 'integer', example: 1 },
};

export const createGuestRequestSwaggerSchema = {
  type: 'object',
  required: [
    'firstName',
    'lastName',
    'phoneNumber',
    'checkInDate',
    'checkOutDate',
    'roomNumber',
    'floorNumber',
  ],
  properties: guestRequestProperties,
};

export const updateGuestRequestSwaggerSchema = {
  type: 'object',
  minProperties: 1,
  properties: guestRequestProperties,
};

export const bulkCreateGuestsRequestSwaggerSchema = {
  type: 'object',
  required: ['guests'],
  properties: {
    guests: {
      type: 'array',
      minItems: 1,
      maxItems: 500,
      items: createGuestRequestSwaggerSchema,
    },
  },
};

export const bulkDeleteGuestsRequestSwaggerSchema = {
  type: 'object',
  required: ['ids'],
  properties: {
    ids: {
      type: 'array',
      minItems: 1,
      maxItems: 500,
      uniqueItems: true,
      items: { type: 'string', format: 'uuid' },
    },
  },
};

export const guestResponseSwaggerSchema = {
  type: 'object',
  required: [
    'id',
    'hotelId',
    'firstName',
    'lastName',
    'email',
    'phoneNumber',
    'marketingConsent',
    'address',
    'checkInDate',
    'checkOutDate',
    'roomNumber',
    'floorNumber',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    hotelId: { type: 'string', format: 'uuid' },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    email: { type: 'string', format: 'email', nullable: true },
    phoneNumber: { type: 'string' },
    marketingConsent: { type: 'boolean', default: false },
    address: { type: 'string', nullable: true },
    checkInDate: { type: 'string', format: 'date-time' },
    checkOutDate: { type: 'string', format: 'date-time' },
    roomNumber: { type: 'integer' },
    floorNumber: { type: 'integer' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};
