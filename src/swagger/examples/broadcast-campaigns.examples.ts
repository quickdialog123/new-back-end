export const broadcastCampaignCreateRequestExample = {
  name: 'Summer offer',
  templateName: 'summer_offer',
  templateLanguage: 'en_US',
  guestIds: ['5f6e7d8c-9b0a-4c1d-8e2f-1234567890ab'],
  productRetailerIds: ['summer-hat', 'beach-towel'],
};

export const broadcastCampaignUpdateRequestExample = {
  name: 'Summer offer — revised',
  guestIds: ['5f6e7d8c-9b0a-4c1d-8e2f-1234567890ab'],
  productRetailerIds: ['beach-towel', 'summer-hat'],
};

export const broadcastCampaignResponseExample = {
  id: 'f1a26747-566c-4b94-b901-6c3b932d0c71',
  hotelId: '2ec22ad8-0e09-43e1-a818-dc5345fc777b',
  name: 'Summer offer',
  templateName: 'summer_offer',
  templateLanguage: 'en_US',
  productRetailerIds: ['summer-hat', 'beach-towel'],
  status: 'DRAFT',
  createdAt: '2026-11-24T12:00:00.000Z',
  updatedAt: '2026-11-24T12:00:00.000Z',
  guests: [
    {
      status: null,
      guest: {
        id: '5f6e7d8c-9b0a-4c1d-8e2f-1234567890ab',
        firstName: 'Sam',
        lastName: 'Guest',
        email: 'sam@example.com',
        phoneNumber: '+15550100000',
        roomNumber: 101,
      },
    },
  ],
};

export const broadcastCampaignListItemExample = {
  id: broadcastCampaignResponseExample.id,
  hotelId: broadcastCampaignResponseExample.hotelId,
  name: broadcastCampaignResponseExample.name,
  templateName: broadcastCampaignResponseExample.templateName,
  templateLanguage: broadcastCampaignResponseExample.templateLanguage,
  productRetailerIds: broadcastCampaignResponseExample.productRetailerIds,
  status: broadcastCampaignResponseExample.status,
  createdAt: broadcastCampaignResponseExample.createdAt,
  updatedAt: broadcastCampaignResponseExample.updatedAt,
  guestCount: 1,
  productCount: 2,
};

export const broadcastCampaignPreviewResponseExample = {
  campaignId: broadcastCampaignResponseExample.id,
  template: {
    id: '123456789012345',
    name: 'summer_offer',
    language: 'en_US',
    category: 'MARKETING',
    status: 'APPROVED',
    components: [{ type: 'BODY', text: 'Enjoy your summer stay!' }],
  },
};

export const broadcastCampaignStartResponseExample = {
  campaignId: broadcastCampaignResponseExample.id,
  status: 'SENDING',
};
