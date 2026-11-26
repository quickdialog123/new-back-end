export const whatsappStatusResponseExample = {
  status: 'CONNECTED',
  wabaId: '123456789012345',
  phoneNumber: '+15551234567',
  displayName: 'QuickDialog Hotel',
  wabaStatus: 'APPROVED',
  qualityRating: 'GREEN',
  connectedAt: '2026-10-28T12:00:00.000Z',
  errorMessage: null,
};

export const whatsappDisconnectedStatusResponseExample = {
  status: 'NOT_CONNECTED',
  wabaId: null,
  phoneNumber: null,
  displayName: null,
  wabaStatus: null,
  qualityRating: null,
  connectedAt: null,
  errorMessage: null,
};

export const embeddedSignupRequestExample = {
  code: '<embedded-signup-code>',
  wabaId: '123456789012345',
  phoneNumberId: '987654321098765',
};

export const registerWhatsAppPhoneRequestExample = { pin: '123456' };

export const catalogConnectionResponseExample = {
  status: 'connected',
  catalog: {
    id: 'catalog-123',
    name: 'Hotel catalog',
    vertical: 'travel',
    productCount: 10,
  },
  catalogVisible: true,
  cartEnabled: false,
};

export const disconnectedCatalogResponseExample = {
  status: 'not_connected',
  catalog: null,
  catalogVisible: false,
  cartEnabled: false,
};

export const availableCatalogsResponseExample = [
  catalogConnectionResponseExample.catalog,
];

export const connectCatalogRequestExample = { catalogId: 'catalog-123' };

export const updateCatalogSettingsRequestExample = {
  catalogVisible: true,
  cartEnabled: true,
};

export const productExample = {
  productId: 'summer-hat',
  name: 'Summer hat',
  description: 'A lightweight sun hat.',
  productUrl: 'https://shop.example.com/products/summer-hat',
  imageUrl: 'https://shop.example.com/images/summer-hat.jpg',
  availability: 'in stock',
  price: '24.99',
  currency: 'USD',
  brand: 'Example Goods',
  condition: 'new',
};

export const productPageResponseExample = {
  data: [productExample],
  paging: {
    cursors: { after: 'next-page-cursor' },
    next: 'https://graph.facebook.com/catalog-123/products?after=next-page-cursor',
  },
};

export const createProductRequestExample = {
  name: productExample.name,
  description: productExample.description,
  productUrl: productExample.productUrl,
  imageUrl: productExample.imageUrl,
  price: productExample.price,
  currency: productExample.currency,
  availability: productExample.availability,
  brand: productExample.brand,
  condition: productExample.condition,
};

export const updateProductRequestExample = { price: '26.99', currency: 'USD' };

export const productBatchResponseExample = {
  productId: '6a6e7d8c-9b0a-4c1d-8e2f-1234567890ab',
  handle: 'batch-handle-123',
  status: 'finished',
  errors: [],
  warnings: [],
  products: [productExample],
  paging: { cursors: { after: null } },
};

export const productUpdateBatchResponseExample = {
  ...productBatchResponseExample,
  productId: productExample.productId,
};

export const productDeleteBatchResponseExample = {
  handle: 'batch-handle-123',
  status: 'finished',
  errors: [],
  warnings: [],
};

export const catalogOperationStatusResponseExample = {
  handle: 'batch-handle-123',
  status: 'finished',
  errors: [],
  warnings: [],
  products: [productExample],
};
