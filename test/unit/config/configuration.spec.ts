import { afterEach, describe, expect, it, vi } from 'vitest';

import configuration from '@quickdialog/config/configuration.js';

describe('configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('maps environment variables into grouped config', () => {
    vi.stubEnv('NODE_ENV', 'test');

    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');

    vi.stubEnv('JWT_ACCESS_SECRET', 'test-secret-at-least-32-characters-long');

    const result = configuration();

    expect(result).toHaveProperty('app');

    expect(result).toHaveProperty('database');

    expect(result).toHaveProperty('auth');
  });
});
