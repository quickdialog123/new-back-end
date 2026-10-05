import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { LoggingModule } from './common/logging/logging.module.js';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from '@quickdialog/config/configuration.js';
import { validateEnvironment } from '@quickdialog/config/env.schema.js';
import { HealthModule } from '@quickdialog/health/health.module.js';
import { DatabaseModule } from '@quickdialog/database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { GlobalExceptionFilter } from './common/errors/global-exception.filter.js';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RolesGuard } from './common/guards/roles.guard.js';
import { OriginGuard } from './common/guards/origin.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    HealthModule,
    DatabaseModule,
    AuthModule,
    LoggingModule,
  ],
  // Read this before start https://docs.nestjs.com/fundamentals/custom-providers
  providers: [
    {
      provide: APP_GUARD, // token mean global guard
      useClass: JwtAuthGuard, // that mean when need a global guard use JwtAuthGuard class
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter, // mean normalize all uncaught exceptions globally
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: OriginGuard,
    },
  ],
})
export class AppModule {}
