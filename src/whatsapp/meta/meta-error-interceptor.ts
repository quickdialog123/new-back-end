import type { HttpClientInterceptorFn } from '@nestjs/http-client';
import { MetaApiError } from '@quickdialog/common/errors/meta-api.error.js';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readMetaErrorContext(
  response: Response,
): Promise<Record<string, unknown> | undefined> {
  try {
    const body: unknown = await response.clone().json();
    if (isObject(body) && isObject(body.error)) {
      return body.error;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export const metaGraphErrorInterceptor: HttpClientInterceptorFn = async (
  request,
  next,
) => {
  const response = await next(request);

  if (response.ok) {
    return response;
  }

  throw new MetaApiError(await readMetaErrorContext(response));
};
