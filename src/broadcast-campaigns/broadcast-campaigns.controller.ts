import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '@quickdialog/auth/types/authenticated-user.type.js';
import { CurrentUser } from '@quickdialog/common/decorators/current-user.decorator.js';
import { Roles } from '@quickdialog/common/decorators/roles.decorator.js';
import { UserRole } from '@quickdialog/generated/prisma/client.js';
import {
  ApiCreateBroadcastCampaignDocs,
  ApiDeleteBroadcastCampaignDocs,
  ApiGetBroadcastCampaignDocs,
  ApiListBroadcastCampaignsDocs,
  ApiPreviewBroadcastCampaignDocs,
  ApiStartBroadcastCampaignDocs,
  ApiUpdateBroadcastCampaignDocs,
} from '@quickdialog/swagger/decorators/broadcast-campaigns.decorator.js';
import {
  broadcastCampaignIdSchema,
  createBroadcastCampaignSchema,
  type BroadcastCampaignIdDTO,
  type CreateBroadcastCampaignDTO,
  type UpdateBroadcastCampaignDTO,
  updateBroadcastCampaignSchema,
} from './schemas/broadcast-campaign.schema.js';
import { BroadcastCampaignsService } from './broadcast-campaigns.service.js';

@ApiTags('Broadcast Campaigns')
@Roles(UserRole.OWNER, UserRole.STAFF)
@Controller('broadcast-campaigns')
export class BroadcastCampaignsController {
  constructor(private readonly campaigns: BroadcastCampaignsService) {}

  @Post()
  @ApiCreateBroadcastCampaignDocs()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: createBroadcastCampaignSchema })
    input: CreateBroadcastCampaignDTO,
  ) {
    return this.campaigns.create(user.hotelId!, input);
  }

  @Get()
  @ApiListBroadcastCampaignsDocs()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.campaigns.findAll(user.hotelId!);
  }

  @Get(':id')
  @ApiGetBroadcastCampaignDocs()
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: broadcastCampaignIdSchema })
    { id }: BroadcastCampaignIdDTO,
  ) {
    return this.campaigns.findOne(user.hotelId!, id);
  }

  @Patch(':id')
  @ApiUpdateBroadcastCampaignDocs()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: broadcastCampaignIdSchema })
    { id }: BroadcastCampaignIdDTO,
    @Body({ schema: updateBroadcastCampaignSchema })
    input: UpdateBroadcastCampaignDTO,
  ) {
    return this.campaigns.update(user.hotelId!, id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteBroadcastCampaignDocs()
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: broadcastCampaignIdSchema })
    { id }: BroadcastCampaignIdDTO,
  ) {
    return this.campaigns.remove(user.hotelId!, id);
  }

  @Post(':id/preview')
  @HttpCode(HttpStatus.OK)
  @ApiPreviewBroadcastCampaignDocs()
  preview(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: broadcastCampaignIdSchema })
    { id }: BroadcastCampaignIdDTO,
  ) {
    return this.campaigns.preview(user.hotelId!, id);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiStartBroadcastCampaignDocs()
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Param({ schema: broadcastCampaignIdSchema })
    { id }: BroadcastCampaignIdDTO,
  ) {
    return this.campaigns.start(user.hotelId!, id);
  }
}
