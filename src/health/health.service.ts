import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '@quickdialog/database/prisma.service.js';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        app: 'Quick Dialog App',
        status: 'Healthy',
        checks: {
          database: {
            status: 'up',
          },
        },
      };
    } catch {
      throw new ServiceUnavailableException({
        app: 'Quick Dialog App',
        status: 'Unhealthy',
        checks: {
          database: {
            status: 'down',
          },
        },
      });
    }
  }
}
