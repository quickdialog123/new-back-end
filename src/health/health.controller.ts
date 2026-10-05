import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service.js';
import { Public } from '@quickdialog/common/decorators/public.decorator.js';
import { ApiHealthDocs } from '@quickdialog/swagger/decorators/health.decorator.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @ApiHealthDocs()
  @Get()
  check() {
    return this.healthService.check();
  }
}
