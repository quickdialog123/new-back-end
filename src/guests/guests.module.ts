import { Module } from '@nestjs/common';

import { GuestsController } from './guests.controller.js';
import { GuestsService } from './guests.service.js';

@Module({
  controllers: [GuestsController],
  providers: [GuestsService],
})
export class GuestsModule {}
