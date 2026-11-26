export const templateInputExample = {
  name: 'welcome_guest',
  category: 'UTILITY',
  language: 'en_US',
  header: null,
  body: 'Hello {{firstName}}, welcome to our hotel.',
  footer: null,
  buttons: [],
  sampleValues: { firstName: 'Sam' },
};

export const templateResponseExample = {
  id: '123456789012345',
  name: 'welcome_guest',
  category: 'UTILITY',
  language: 'en_US',
  header: null,
  body: 'Hello {{1}}, welcome to our hotel.',
  footer: null,
  buttons: [],
  status: 'APPROVED',
  broadcastEligible: true,
};

export const templateListResponseExample = {
  data: [templateResponseExample],
  paging: { after: null },
};

export const templateMediaUploadResponseExample = {
  mediaHandle: '<meta-media-handle>',
};
