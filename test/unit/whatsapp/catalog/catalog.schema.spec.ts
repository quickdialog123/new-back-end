import { describe, expect, it } from 'vitest';

import {
  createProductSchema,
  updateProductSchema,
} from '@quickdialog/whatsapp/catalog/schemas/product.schema.js';

const validProduct = {
  name: 'Coffee',
  description: 'Freshly roasted coffee',
  productUrl: 'https://shop.example.com/coffee',
  imageUrl: 'https://cdn.example.com/coffee.jpg',
  price: '12.50',
  currency: 'USD',
  availability: 'in stock',
  brand: 'QuickDialog',
  condition: 'new',
};

describe('product schemas', () => {
  it('validates a create request and requires Meta product fields', () => {
    expect(createProductSchema.safeParse(validProduct).success).toBe(true);
    expect(
      createProductSchema.safeParse({ ...validProduct, productUrl: undefined })
        .success,
    ).toBe(false);
    expect(
      createProductSchema.safeParse({ ...validProduct, imageUrl: 'not-a-url' })
        .success,
    ).toBe(false);
  });

  it('requires at least one valid update field', () => {
    expect(updateProductSchema.safeParse({ name: 'New name' }).success).toBe(
      true,
    );
    expect(updateProductSchema.safeParse({}).success).toBe(false);
    expect(updateProductSchema.safeParse({ currency: 'usd' }).success).toBe(
      false,
    );
  });
});
