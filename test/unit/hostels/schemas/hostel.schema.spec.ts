import { describe, expect, it } from 'vitest';

import { createHostelSchema } from '@quickdialog/hostels/schemas/hostel.schema.js';

describe('createHostelSchema', () => {
  it('accepts a hostel with a name, phone number, and token', () => {
    const result = createHostelSchema.safeParse({
      name: 'North Hall',
      phoneNumber: '+15551234567',
      token: 'hostel-token',
    });

    expect(result.success).toBe(true);
  });

  it('trims the hostel name', () => {
    const result = createHostelSchema.safeParse({
      name: '  North Hall  ',
      phoneNumber: '+15551234567',
      token: 'hostel-token',
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe('North Hall');
  });

  it('rejects blank required fields', () => {
    const result = createHostelSchema.safeParse({
      name: '  ',
      phoneNumber: '',
      token: '',
    });

    expect(result.success).toBe(false);
  });
});
