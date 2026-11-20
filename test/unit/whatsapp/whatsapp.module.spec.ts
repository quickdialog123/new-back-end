import { HttpClientModule } from '@nestjs/http-client';
import type { DynamicModule, Provider } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { WhatsappModule } from '@quickdialog/whatsapp/whatsapp.module.js';
import { metaGraphErrorInterceptor } from '@quickdialog/whatsapp/meta/meta-error-interceptor.js';

describe('WhatsappModule', () => {
  it('registers the Meta error interceptor on its HTTP client', () => {
    const imports = Reflect.getMetadata('imports', WhatsappModule) as Array<
      DynamicModule | Function
    >;
    const httpClientModule = imports.find(
      (module): module is DynamicModule =>
        typeof module === 'object' && module.module === HttpClientModule,
    );
    const interceptorProvider = httpClientModule?.providers?.find(
      (provider): provider is Extract<Provider, { useValue: unknown }> =>
        typeof provider === 'object' &&
        'useValue' in provider &&
        'provide' in provider &&
        typeof provider.provide === 'symbol' &&
        provider.provide.description === 'HTTP_CLIENT_INTERCEPTORS',
    );

    expect(interceptorProvider).toBeDefined();
    expect(interceptorProvider?.useValue).toContain(metaGraphErrorInterceptor);
  });
});
