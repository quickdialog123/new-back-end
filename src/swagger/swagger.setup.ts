import { ConfigService } from '@nestjs/config';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule } from '@nestjs/swagger';
import { createSwaggerConfig } from './swagger.config.js';

export function setupSwagger(
  app: NestFastifyApplication,
  config: ConfigService,
): void {
  if (!config.get<boolean>('swagger.enabled')) return;

  const document = SwaggerModule.createDocument(
    app,
    createSwaggerConfig(config),
  );

  SwaggerModule.setup(
    config.get<string>('swagger.path', 'docs'),
    app,
    document,
    {
      swaggerOptions: {
        persistAuthorization: true,
      },
    },
  );
}
