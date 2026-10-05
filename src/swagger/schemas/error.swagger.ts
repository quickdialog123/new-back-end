export const apiErrorSchema = {
  type: 'object',
  required: ['statusCode', 'code', 'message', 'path', 'timestamp'],
  properties: {
    statusCode: {
      type: 'integer',
    },
    code: {
      type: 'string',
    },
    message: {
      type: 'string',
    },
    details: {
      description: 'Additional validation or endpoint-specific error details.',
    },
    path: {
      type: 'string',
    },
    requestId: {
      type: 'string',
      format: 'uuid',
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
    },
  },
};
