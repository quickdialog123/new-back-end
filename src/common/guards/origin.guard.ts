import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.config.getOrThrow<string>('app.nodeEnv') !== 'production') {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const origin = request.headers.origin;

    // Allow non-browser/server-to-server requests (if need to test it)
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
