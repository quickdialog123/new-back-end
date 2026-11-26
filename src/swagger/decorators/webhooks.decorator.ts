import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

import {
  webhookPayloadExample,
  webhookReceiveResponseExample,
  webhookVerifyQueryExample,
} from '../examples/webhooks.examples.js';
import { ApiErrorResponse } from './common-response.decorator.js';

export function ApiVerifyWhatsAppWebhookDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Verify the WhatsApp webhook callback URL with Meta',
      description:
        'Meta sends hub.mode, hub.verify_token, and hub.challenge as query parameters. The configured verify token must match; the challenge is returned as plain text.',
    }),
    ApiQuery({
      name: 'hub.mode',
      required: true,
      example: webhookVerifyQueryExample.mode,
    }),
    ApiQuery({
      name: 'hub.verify_token',
      required: true,
      example: webhookVerifyQueryExample.verifyToken,
    }),
    ApiQuery({
      name: 'hub.challenge',
      required: true,
      example: webhookVerifyQueryExample.challenge,
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Webhook challenge returned as text/plain',
      content: {
        'text/plain': {
          schema: {
            type: 'string',
            example: webhookVerifyQueryExample.challenge,
          },
        },
      },
    }),
    ApiErrorResponse(HttpStatus.FORBIDDEN, 'Webhook verification failed'),
  );
}

export function ApiReceiveWhatsAppWebhookDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Receive a WhatsApp webhook event from Meta',
      description:
        'Meta signs the raw JSON payload with the app secret. Include the x-hub-signature-256 header.',
    }),
    ApiHeader({
      name: 'x-hub-signature-256',
      required: true,
      example:
        'sha256=4d44b4b7cf4ff765ff1dd83243f29f1c13e902468c02d7c0c59f12af5ac7af56',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['object'],
        properties: { object: { type: 'string' }, entry: { type: 'array' } },
        example: webhookPayloadExample,
      },
      examples: {
        message: {
          summary: 'Inbound WhatsApp text message event',
          value: webhookPayloadExample,
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Webhook accepted',
      schema: {
        type: 'object',
        required: ['received'],
        properties: { received: { type: 'boolean' } },
        example: webhookReceiveResponseExample,
      },
    }),
    ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Invalid webhook signature'),
  );
}
