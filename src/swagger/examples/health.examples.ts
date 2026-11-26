export const healthyResponseExample = {
  app: 'Quick Dialog App',
  status: 'Healthy',
  checks: { database: { status: 'up' } },
};

export const unhealthyResponseExample = {
  statusCode: 503,
  code: 'SERVICE_UNAVAILABLE',
  message: 'Service unavailable',
  path: '/api/health',
  requestId: '17982e36-0e3d-4118-abd7-622e9f573ebd',
  timestamp: '2026-11-26T12:00:00.000Z',
  details: {
    app: 'Quick Dialog App',
    status: 'Unhealthy',
    checks: { database: { status: 'down' } },
  },
};
