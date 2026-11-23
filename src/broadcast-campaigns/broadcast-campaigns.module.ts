import { Module } from '@nestjs/common';

import { WhatsappModule } from '@quickdialog/whatsapp/whatsapp.module.js';
import { BroadcastCampaignsController } from './broadcast-campaigns.controller.js';
import { BroadcastCampaignsService } from './broadcast-campaigns.service.js';

@Module({
  imports: [WhatsappModule],
  controllers: [BroadcastCampaignsController],
  providers: [BroadcastCampaignsService],
})
export class BroadcastCampaignsModule {}
