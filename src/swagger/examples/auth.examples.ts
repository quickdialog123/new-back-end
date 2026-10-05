export const loginSuccessExample = {
  accessToken: '<access-token>',
};

export const validationErrorExample = {
  statusCode: 400,
  code: 'VALIDATION_ERROR',
  message: 'Request validation failed',
  path: '/api/auth/login',
  requestId: '17982e36-0e3d-4118-abd7-622e9f573ebd',
  timestamp: '2026-10-02T14:02:04.786Z',
  details: [
    {
      field: 'email',
      message: 'Invalid email address',
    },
  ],
};

export function createUnauthorizedExample(path: string, message: string) {
  return {
    statusCode: 401,
    code: 'UNAUTHORIZED',
    message,
    path,
    requestId: '17982e36-0e3d-4118-abd7-622e9f573ebd',
    timestamp: '2026-10-02T14:01:53.098Z',
  };
}

export const currentUserExample = {
  userId: '4e3ee6a0-eec9-47c8-9fe3-e92afe8a2b1b',
  sessionId: '8d234fad-ceec-4f64-bb1b-1459c0b16cd7',
  hotelId: null,
  role: 'OWNER',
};
