import { describe, expect, it, vi } from 'vitest';

import { MetaApiError } from '@quickdialog/common/errors/meta-api.error.js';
import { metaGraphErrorInterceptor } from '@quickdialog/whatsapp/meta/meta-error-interceptor.js';

describe('metaGraphErrorInterceptor', () => {
  it('returns successful responses unchanged', async () => {
    const response = new Response('ok', { status: 200 });
    const next = vi.fn().mockResolvedValue(response);

    await expect(
      metaGraphErrorInterceptor({} as never, next),
    ).resolves.toBe(response);
    expect(next).toHaveBeenCalledExactlyOnceWith({});
  });

  it('throws MetaApiError with the structured Meta error body', async () => {
    const metaError = {
      message: 'Application does not have permission for this action',
      type: 'OAuthException',
      code: 10,
      error_subcode: 1690129,
      error_user_msg: 'You do not have permission to create a catalogue.',
    };
    const response = new Response(JSON.stringify({ error: metaError }), {
      status: 400,
    });
    const next = vi.fn().mockResolvedValue(response);

    const error = await metaGraphErrorInterceptor({} as never, next).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(MetaApiError);
    expect((error as MetaApiError).context).toEqual(metaError);
  });

  it('throws MetaApiError without context when the error body has no Meta error', async () => {
    const response = new Response(JSON.stringify({ message: 'Bad request' }), {
      status: 400,
    });
    const next = vi.fn().mockResolvedValue(response);

    await expect(metaGraphErrorInterceptor({} as never, next)).rejects.toMatchObject({
      name: 'MetaApiError',
      context: undefined,
    });
  });

  it('throws MetaApiError without context when the error body is not JSON', async () => {
    const response = new Response('not json', { status: 400 });
    const next = vi.fn().mockResolvedValue(response);

    await expect(metaGraphErrorInterceptor({} as never, next)).rejects.toMatchObject({
      name: 'MetaApiError',
      context: undefined,
    });
  });
});
