import { describe, expect, it } from 'vitest';
import type { OpenAPIObject } from '@nestjs/swagger';

import {
  buildNestedTags,
  SWAGGER_TAGS,
} from '@quickdialog/swagger/swagger.tags.js';

describe('Swagger tags', () => {
  it('builds navigable parent and child tags from documented operations', () => {
    const document = {
      paths: {
        '/health': {
          get: { tags: [SWAGGER_TAGS.HEALTH] },
        },
        '/whatsapp/webhooks': {
          post: { tags: [SWAGGER_TAGS.WHATSAPP.WEBHOOK.ROOT] },
        },
        '/ignored': {
          parameters: [],
        },
        '/missing': undefined,
      },
    } as unknown as OpenAPIObject;

    buildNestedTags(document);

    expect(document.tags).toEqual([
      { name: 'Health' },
      { name: 'Whatsapp', kind: 'nav' },
      {
        name: 'Whatsapp / Webhook',
        summary: 'Webhook',
        parent: 'Whatsapp',
      },
    ]);
  });
});
