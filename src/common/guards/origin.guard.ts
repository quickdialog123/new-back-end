import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { SKIP_ORIGIN_CHECK_KEY } from '../decorators/skip-origin-check.decorator.js';

@Injectable()
export class OriginGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const skipOriginCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_ORIGIN_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipOriginCheck) {
      return true;
    }

    // dev testing
    // if (this.config.getOrThrow<string>('app.nodeEnv') !== 'production') {
    //   return true;
    // }

    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const origin = request.headers.origin;

    if (!origin) {
      return false;
    }

    const allowedOrigins = this.config
      .getOrThrow<string>('app.corsOrigin')
      .split(',')
      .map((value) => value.trim());

    if (!allowedOrigins.includes(origin)) {
      throw new ForbiddenException('Invalid origin');
    }

    return true;
  }
}
