import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  broadcastCampaignPreviewSwaggerSchema,
  broadcastCampaignRequestSwaggerSchema,
  broadcastCampaignResponseSwaggerSchema,
  updateBroadcastCampaignRequestSwaggerSchema,
} from '../schemas/broadcast-campaigns.swagger.js';

export function ApiCreateBroadcastCampaignDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a broadcast campaign for the authenticated hotel',
    }),
    ApiBody({ schema: broadcastCampaignRequestSwaggerSchema }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Broadcast campaign created',
      schema: broadcastCampaignResponseSwaggerSchema,
    }),
  );
}

export function ApiListBroadcastCampaignsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List broadcast campaigns for the authenticated hotel',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Broadcast campaigns returned',
      schema: {
        type: 'array',
        items: broadcastCampaignResponseSwaggerSchema,
      },
    }),
  );
}

export function ApiGetBroadcastCampaignDocs() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Get a broadcast campaign and its guests for the authenticated hotel',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Broadcast campaign returned',
      schema: broadcastCampaignResponseSwaggerSchema,
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Broadcast campaign not found for this hotel',
    }),
  );
}

export function ApiUpdateBroadcastCampaignDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update a broadcast campaign for the authenticated hotel',
    }),
    ApiBody({ schema: updateBroadcastCampaignRequestSwaggerSchema }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Broadcast campaign updated',
      schema: broadcastCampaignResponseSwaggerSchema,
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Broadcast campaign or one or more guests not found',
    }),
  );
}

export function ApiDeleteBroadcastCampaignDocs() {
  return applyDecorators(
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
    ApiOperation({
      summary: 'Preview the selected Meta template for a broadcast campaign',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Meta template preview returned',
      schema: broadcastCampaignPreviewSwaggerSchema,
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Campaign or selected Meta template not found',
    }),
  );
}

export function ApiStartBroadcastCampaignDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Start a broadcast campaign',
      description:
        'Start sending messages to the guests of a broadcast campaign.',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Start endpoint placeholder; no messages are sent yet',
    }),
  );
}
