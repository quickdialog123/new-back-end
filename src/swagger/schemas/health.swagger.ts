export const healthSwaggerSchema = {
  type: 'object',
  required: ['app', 'status', 'checks'],
  properties: {
    app: {
      type: 'string',
      example: 'Quick Dialog App',
    },
    status: {
      type: 'string',
      example: 'Healthy',
    },
    checks: {
      type: 'object',
      required: ['database'],
      properties: {
        database: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['up'],
              example: 'up',
            },
          },
        },
      },
    },
  },
};
