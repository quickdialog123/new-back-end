import { ConfigService } from '@nestjs/config';
import { DocumentBuilder } from '@nestjs/swagger';

export function createSwaggerConfig(config: ConfigService) {
  return new DocumentBuilder()
    .setTitle(config.get<string>('swagger.title', 'QuickDialog API'))
    .setDescription(
      config.get<string>(
        'swagger.description',
        'REST API for the QuickDialog hotel messaging platform.',
      ),
    )
    .setVersion(config.get<string>('swagger.version', '1.0'))
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'QuickDialog access token',
      },
      'access-token',
    )
    .addCookieAuth(
      'refresh_token',
      {
        type: 'apiKey',
        in: 'cookie',
        description: 'HttpOnly refresh token issued by login or refresh.',
      },
      'refresh-token',
    )
    .build();
}
