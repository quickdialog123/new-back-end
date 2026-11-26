export const webhookVerifyQueryExample = {
  mode: 'subscribe',
  verifyToken: '<configured-webhook-verify-token>',
  challenge: '1234567890',
};

export const webhookPayloadExample = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '123456789012345',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '+15551234567',
              phone_number_id: '987654321098765',
            },
            messages: [
              {
                from: '15550100000',
                id: 'wamid.example-message-id',
                timestamp: '1732644000',
                type: 'text',
                text: { body: 'Hello!' },
              },
            ],
          },
        },
      ],
    },
  ],
};

export const webhookReceiveResponseExample = { received: true };
