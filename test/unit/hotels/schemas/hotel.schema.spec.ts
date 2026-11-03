import { describe, expect, it } from 'vitest';
import {
  createHotelSchema,
  hotelIdParamSchema,
  updateHotelSchema,
} from '@quickdialog/hotels/schemas/hotel.schema.js';

describe('createHotelSchema', () => {
  it('accepts a hotel and its initial owner', () => {
    const result = createHotelSchema.safeParse({
      name: 'Grand Hotel',
      phoneNumber: '+1 555 123 4567',
      token: 'hotel-token',
      owner: {
        email: 'owner@example.com',
        fullName: 'Hotel Owner',
        password: 'Password123!',
      },
    });

    expect(result.success).toBe(true);
  });

  it('trims the hotel name', () => {
    const result = createHotelSchema.parse({
      name: '  Grand Hotel  ',
      phoneNumber: '+1 555 123 4567',
      token: 'hotel-token',
      owner: {
        email: 'owner@example.com',
        fullName: 'Hotel Owner',
        password: 'Password123!',
      },
    });

    expect(result.name).toBe('Grand Hotel');
  });

  it('rejects blank fields', () => {
    const result = createHotelSchema.safeParse({
      name: ' ',
      phoneNumber: ' ',
      token: ' ',
      owner: {
        email: 'invalid-email',
        fullName: ' ',
        password: 'short',
      },
    });

    expect(result.success).toBe(false);
  });
});

describe('updateHotelSchema', () => {
  it('requires at least one mutable hotel field', () => {
    expect(updateHotelSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a partial update and trims supplied values', () => {
    const result = updateHotelSchema.parse({ name: '  Updated Hotel  ' });

    expect(result).toEqual({ name: 'Updated Hotel' });
  });
});

describe('hotelIdParamSchema', () => {
  it('accepts UUID ids and rejects non-UUID ids', () => {
    expect(
      hotelIdParamSchema.safeParse({
        id: '4e3ee6a0-eec9-47c8-9fe3-e92afe8a2b1b',
      }).success,
    ).toBe(true);
    expect(hotelIdParamSchema.safeParse({ id: 'hotel-id' }).success).toBe(
      false,
    );
  });
});
