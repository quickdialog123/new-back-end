import { Module } from '@nestjs/common';
import { HealthController } from '@quickdialog/health/health.controller.js';
import { HealthService } from './health.service.js';

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
