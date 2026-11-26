import { Module } from '@nestjs/common';

import { HotelsController } from './hotels.controller.js';
import { HotelsService } from './hotels.service.js';

@Module({
  controllers: [HotelsController],
  providers: [HotelsService],
})
export class HotelModule {}
