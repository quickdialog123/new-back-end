import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  type RawBodyRequest,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';

const SIGNATURE_HEADER = 'x-hub-signature-256';
const SIGNATURE_PREFIX = 'sha256=';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(WebhookSignatureGuard.name);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RawBodyRequest<FastifyRequest>>();

    /**
     * example signature:  sha256=4d44b4b7cf4ff765ff1dd83243f29f1c13e902468c02d7c0c59f12af5ac7af56
     */
    const signature = request.headers[SIGNATURE_HEADER];
    const rawBody = request.rawBody;

    if (typeof signature !== 'string' || !rawBody) {
      this.logger.warn(
        {
          hasSignature: typeof signature === 'string',
          hasRawBody: Boolean(rawBody),
        },
        'Meta webhook signature missing',
      );

      throw new UnauthorizedException('Invalid webhook signature');
    }

    if (!signature.startsWith(SIGNATURE_PREFIX)) {
      this.logger.warn('Meta webhook signature has invalid format');

      throw new UnauthorizedException('Invalid webhook signature');
    }

    const receivedDigest = signature.slice(SIGNATURE_PREFIX.length);

    if (!/^[a-f0-9]{64}$/i.test(receivedDigest)) {
      this.logger.warn('Meta webhook signature has invalid digest');

      throw new UnauthorizedException('Invalid webhook signature');
    }

    const appSecret = this.config.getOrThrow<string>('meta.appSecret');

    const expectedDigest = createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    const receivedBuffer = Buffer.from(receivedDigest, 'hex');

    const expectedBuffer = Buffer.from(expectedDigest, 'hex');

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      this.logger.warn('Meta webhook signature verification failed');

      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
