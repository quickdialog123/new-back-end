export const guestCreateRequestExample = {
  firstName: 'Sam',
  lastName: 'Guest',
  email: 'sam@example.com',
  phoneNumber: '+15550100000',
  marketingConsent: true,
  address: '42 Example Street',
  checkInDate: '2026-11-19',
  checkOutDate: '2026-11-20',
  roomNumber: 101,
  floorNumber: 1,
};

export const guestUpdateRequestExample = {
  marketingConsent: false,
  checkOutDate: '2026-11-21',
};

export const guestResponseExample = {
  id: '5f6e7d8c-9b0a-4c1d-8e2f-1234567890ab',
  hotelId: '2ec22ad8-0e09-43e1-a818-dc5345fc777b',
  ...guestCreateRequestExample,
  checkInDate: '2026-11-19T00:00:00.000Z',
  checkOutDate: '2026-11-20T00:00:00.000Z',
  createdAt: '2026-11-01T09:00:00.000Z',
  updatedAt: '2026-11-01T09:00:00.000Z',
};

export const guestBulkCreateRequestExample = {
  guests: [guestCreateRequestExample],
};

export const guestCountResponseExample = { count: 1 };
