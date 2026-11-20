import { describe, expect, it } from 'vitest';

import {
  bulkCreateGuestsSchema,
  bulkDeleteGuestsSchema,
  createGuestSchema,
  updateGuestSchema,
} from '@quickdialog/guests/schemas/guest.schema.js';

const guest = (index: number) => ({
  firstName: 'Guest',
  lastName: `${index}`,
  email: `guest-${index}@example.com`,
  phoneNumber: '+1 555 010 0000',
  checkInDate: '2026-11-19',
  checkOutDate: '2026-11-20',
  roomNumber: 101,
  floorNumber: 1,
});

describe('bulkCreateGuestsSchema', () => {
  it('transforms guest date strings into UTC-midnight Dates', () => {
    const parsed = createGuestSchema.parse(guest(1));

    expect(parsed.checkInDate).toEqual(new Date('2026-11-19T00:00:00.000Z'));
    expect(parsed.checkOutDate).toEqual(new Date('2026-11-20T00:00:00.000Z'));
  });

  it('allows omitted email and address while requiring a phone number', () => {
    const { email: _email, ...guestWithoutEmail } = guest(1);
    const parsedWithoutAddress = createGuestSchema.safeParse(guestWithoutEmail);

    expect(parsedWithoutAddress.success).toBe(true);
    const parsedWithAddress = createGuestSchema.safeParse({
      ...guestWithoutEmail,
      address: '42 Example Street',
    });
    expect(parsedWithAddress.success).toBe(true);
    if (parsedWithAddress.success) {
      expect(parsedWithAddress.data.address).toBe('42 Example Street');
    }
    expect(
      createGuestSchema.safeParse({
        ...guestWithoutEmail,
        phoneNumber: undefined,
      }).success,
    ).toBe(false);
  });

  it('accepts a non-empty batch of valid guests', () => {
    expect(
      bulkCreateGuestsSchema.safeParse({ guests: [guest(1), guest(2)] })
        .success,
    ).toBe(true);
  });

  it('rejects an empty batch', () => {
    expect(bulkCreateGuestsSchema.safeParse({ guests: [] }).success).toBe(
      false,
    );
  });

  it('rejects a batch larger than 500 guests', () => {
    expect(
      bulkCreateGuestsSchema.safeParse({
        guests: Array.from({ length: 501 }, (_, index) => guest(index)),
      }).success,
    ).toBe(false);
  });

  it('rejects the batch when any guest is invalid', () => {
    expect(
      bulkCreateGuestsSchema.safeParse({
        guests: [guest(1), { ...guest(2), email: 'invalid-email' }],
      }).success,
    ).toBe(false);
  });

  it('rejects a guest whose check-out is not after check-in', () => {
    expect(
      bulkCreateGuestsSchema.safeParse({
        guests: [{ ...guest(1), checkOutDate: '2026-11-19' }],
      }).success,
    ).toBe(false);
  });

  it('rejects non-integer room and floor numbers', () => {
    expect(
      bulkCreateGuestsSchema.safeParse({
        guests: [{ ...guest(1), roomNumber: 101.5 }],
      }).success,
    ).toBe(false);
    expect(
      bulkCreateGuestsSchema.safeParse({
        guests: [{ ...guest(1), floorNumber: 1.5 }],
      }).success,
    ).toBe(false);
  });
});

describe('updateGuestSchema', () => {
  it('transforms provided date strings into UTC-midnight Dates', () => {
    const parsed = updateGuestSchema.parse({ checkInDate: '2026-11-19' });

    expect(parsed.checkInDate).toEqual(new Date('2026-11-19T00:00:00.000Z'));
  });

  it('allows updating optional email and address fields', () => {
    const parsed = updateGuestSchema.safeParse({
      email: 'updated@example.com',
      address: '42 Example Street',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toMatchObject({
        email: 'updated@example.com',
        address: '42 Example Street',
      });
    }
  });
});

describe('bulkDeleteGuestsSchema', () => {
  it('accepts a non-empty batch of UUIDs', () => {
    expect(
      bulkDeleteGuestsSchema.safeParse({
        ids: [
          '00000000-0000-4000-8000-000000000001',
          '00000000-0000-4000-8000-000000000002',
        ],
      }).success,
    ).toBe(true);
  });

  it('rejects empty, invalid, and over-limit ID batches', () => {
    expect(bulkDeleteGuestsSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(
      bulkDeleteGuestsSchema.safeParse({ ids: ['not-a-uuid'] }).success,
    ).toBe(false);
    expect(
      bulkDeleteGuestsSchema.safeParse({
        ids: Array.from(
          { length: 501 },
          (_, index) =>
            `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
        ),
      }).success,
    ).toBe(false);
  });
});
