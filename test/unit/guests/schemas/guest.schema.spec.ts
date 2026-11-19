import { describe, expect, it } from 'vitest';

import {
  bulkCreateGuestsSchema,
  bulkDeleteGuestsSchema,
} from '@quickdialog/guests/schemas/guest.schema.js';

const guest = (index: number) => ({
  fullName: `Guest ${index}`,
  email: `guest-${index}@example.com`,
  phoneNumber: '+1 555 010 0000',
});

describe('bulkCreateGuestsSchema', () => {
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
    expect(bulkDeleteGuestsSchema.safeParse({ ids: ['not-a-uuid'] }).success).toBe(
      false,
    );
    expect(
      bulkDeleteGuestsSchema.safeParse({
        ids: Array.from({ length: 501 }, (_, index) =>
          `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
        ),
      }).success,
    ).toBe(false);
  });
});
