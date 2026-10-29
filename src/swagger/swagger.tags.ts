import type { OpenAPIObject } from '@nestjs/swagger';

export const SWAGGER_TAGS = {
  AUTH: 'Auth',
  HEALTH: 'Health',

  WHATSAPP: {
    ROOT: 'Whatsapp',
    SEND: 'Whatsapp / SEND',
    WEBHOOK: {
      ROOT: 'Whatsapp / Webhook',
    },
    EMBEDDED_SIGNUP: {
      ROOT: 'Whatsapp / Embedded Signup',
    },
  },
} as const;

export function buildNestedTags(document: OpenAPIObject): void {
  const separator = ' / ';
  const tagNames = new Set<string>();

  for (const path of Object.values(document.paths ?? {})) {
    if (!path) continue;

    for (const operation of Object.values(path)) {
      if (
        operation &&
        typeof operation === 'object' &&
        'tags' in operation &&
        Array.isArray(operation.tags)
      ) {
        for (const tag of operation.tags) {
          tagNames.add(tag);
        }
      }
    }
  }

  document.tags = [];

  for (const tag of tagNames) {
    const [parent, ...rest] = tag.split(separator);

    if (rest.length === 0) {
      document.tags.push({
        name: tag,
      });

      continue;
    }

    if (!document.tags.some((item) => item.name === parent)) {
      document.tags.push({
        name: parent,
        kind: 'nav',
      });
    }

    document.tags.push({
      name: tag,
      summary: rest.join(separator),
      parent,
    });
  }
}
