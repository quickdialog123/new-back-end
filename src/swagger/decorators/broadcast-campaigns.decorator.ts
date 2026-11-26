import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import {
  broadcastCampaignPreviewSwaggerSchema,
  broadcastCampaignRequestSwaggerSchema,
  broadcastCampaignResponseSwaggerSchema,
  updateBroadcastCampaignRequestSwaggerSchema,
} from '../schemas/broadcast-campaigns.swagger.js';
import {
  broadcastCampaignCreateRequestExample,
  broadcastCampaignListItemExample,
  broadcastCampaignPreviewResponseExample,
  broadcastCampaignResponseExample,
  broadcastCampaignStartResponseExample,
  broadcastCampaignUpdateRequestExample,
} from '../examples/broadcast-campaigns.examples.js';
import {
  ApiErrorResponse,
  ApiGlobalGuardResponses,
} from './common-response.decorator.js';

const protectedResponses = () =>
  applyDecorators(
    ApiBearerAuth('access-token'),
    ApiErrorResponse(
      HttpStatus.UNAUTHORIZED,
      'Missing or invalid access token',
    ),
    ApiErrorResponse(HttpStatus.FORBIDDEN, 'Insufficient permissions'),
    ApiGlobalGuardResponses(),
  );

const campaignIdParam = ApiParam({
  name: 'id',
  format: 'uuid',
  example: broadcastCampaignResponseExample.id,
});

export function ApiCreateBroadcastCampaignDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({
      summary: 'Create a broadcast campaign for the authenticated hotel',
    }),
    ApiBody({
      schema: {
        ...broadcastCampaignRequestSwaggerSchema,
        example: broadcastCampaignCreateRequestExample,
      },
      examples: {
        campaign: {
          summary: 'Create a campaign with guests and ordered products',
          value: broadcastCampaignCreateRequestExample,
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Broadcast campaign created',
      schema: {
        ...broadcastCampaignResponseSwaggerSchema,
        example: broadcastCampaignResponseExample,
      },
    }),
  );
}

export function ApiListBroadcastCampaignsDocs() {
  return applyDecorators(
    protectedResponses(),
    ApiOperation({
      summary: 'List broadcast campaigns for the authenticated hotel',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Broadcast campaigns returned',
      schema: {
        type: 'array',
        items: broadcastCampaignResponseSwaggerSchema,
        example: [broadcastCampaignListItemExample],
      },
    }),
  );
}

export function ApiGetBroadcastCampaignDocs() {
  return applyDecorators(
    protectedResponses(),
    campaignIdParam,
    ApiOperation({
      summary:
        'Get a broadcast campaign and its guests for the authenticated hotel',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Broadcast campaign returned',
      schema: {
        ...broadcastCampaignResponseSwaggerSchema,
        example: broadcastCampaignResponseExample,
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Broadcast campaign not found for this hotel',
    }),
  );
}

export function ApiUpdateBroadcastCampaignDocs() {
  return applyDecorators(
    protectedResponses(),
    campaignIdParam,
    ApiOperation({
      summary: 'Update a broadcast campaign for the authenticated hotel',
    }),
    ApiBody({
      schema: {
        ...updateBroadcastCampaignRequestSwaggerSchema,
        example: broadcastCampaignUpdateRequestExample,
      },
      examples: {
        campaign: {
          summary: 'Update a draft campaign',
          value: broadcastCampaignUpdateRequestExample,
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Broadcast campaign updated',
      schema: {
        ...broadcastCampaignResponseSwaggerSchema,
        example: broadcastCampaignResponseExample,
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Broadcast campaign or one or more guests not found',
    }),
  );
}

export function ApiDeleteBroadcastCampaignDocs() {
  return applyDecorators(
    protectedResponses(),
    campaignIdParam,
    ApiOperation({
      summary: 'Delete a broadcast campaign for the authenticated hotel',
    }),
    ApiResponse({
      status: HttpStatus.NO_CONTENT,
      description: 'Broadcast campaign deleted',
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Broadcast campaign not found for this hotel',
    }),
  );
}

export function ApiPreviewBroadcastCampaignDocs() {
  return applyDecorators(
    protectedResponses(),
    campaignIdParam,
    ApiOperation({
      summary: 'Preview the selected Meta template for a broadcast campaign',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Meta template preview returned',
      schema: {
        ...broadcastCampaignPreviewSwaggerSchema,
        example: broadcastCampaignPreviewResponseExample,
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Campaign or selected Meta template not found',
    }),
  );
}

export function ApiStartBroadcastCampaignDocs() {
  return applyDecorators(
    protectedResponses(),
    campaignIdParam,
    ApiOperation({
      summary: 'Start a broadcast campaign',
      description:
        'Start sending messages to the guests of a broadcast campaign.',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Campaign sending was accepted and runs asynchronously',
      schema: {
        type: 'object',
        required: ['campaignId', 'status'],
        properties: {
          campaignId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['SENDING'] },
        },
        example: broadcastCampaignStartResponseExample,
      },
    }),
  );
}
