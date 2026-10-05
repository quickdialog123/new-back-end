import { StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import fastifyCookie from '@fastify/cookie';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '@quickdialog/app.module.js';
import { setupSwagger } from '@quickdialog/swagger/swagger.setup.js';
import { Logger as PinoLogger } from 'nestjs-pino';
import { createValidationException } from '@quickdialog/common/errors/validation-exception.factory.js';
import { randomUUID } from 'node:crypto';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      genReqId: () => randomUUID(), // let http request with UUID not 'req-1'
    }),
    {
      bufferLogs: true, // remove nest startup logs
    },
  );

  await app.register(fastifyCookie);

  const config = app.get(ConfigService); // load env vars

  app.useLogger(app.get(PinoLogger));

  app.useSecurityHeaders();

  app.setGlobalPrefix(config.getOrThrow<string>('app.prefix'));

  const corsOrigin = config.getOrThrow<string>('app.corsOrigin');

  app.enableCors({
    origin: corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  /**
   * validates schemas written with zod and throw exception via custom exception factory
   */
  app.useGlobalPipes(
    new StandardSchemaValidationPipe({
      exceptionFactory: createValidationException,
    }),
  );

  setupSwagger(app, config);

  await app.listen({
    host: config.getOrThrow<string>('app.host'),
    port: config.getOrThrow<number>('app.port'),
  });
}

void bootstrap();
