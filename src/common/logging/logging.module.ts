import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],

      useFactory: (config: ConfigService) => {
        const nodeEnv = config.getOrThrow<string>('app.nodeEnv');

        return {
          pinoHttp: {
            level: config.getOrThrow<string>('app.logLevel'),

            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.headers["x-api-key"]',

                'req.body.password',
                'req.body.accessToken',
                'req.body.refreshToken',

                'res.headers["set-cookie"]',
              ],

              censor: '[REDACTED]',
            },

            serializers: {
              req(request) {
                return {
                  id: request.id,
                  method: request.method,
                  url: request.url,
                };
              },

              res(response) {
                return {
                  statusCode: response.statusCode,
                };
              },
            },

            customLogLevel(_request, response, error) {
              if (response.statusCode >= 500 || error) {
                return 'error';
              }

              if (response.statusCode >= 400) {
                return 'warn';
              }

              return 'info';
            },

            customSuccessMessage(request, response) {
              return `${request.method} ${request.url} ${response.statusCode}`;
            },

            customErrorMessage(request, response) {
              return `${request.method} ${request.url} ${response.statusCode}`;
            },

            transport:
              nodeEnv === 'production'
                ? undefined
                : {
                    target: 'pino-pretty',

                    options: {
                      colorize: true,
                      singleLine: true,
                      translateTime: 'SYS:standard',
                      ignore: 'pid,hostname',
                    },
                  },

            autoLogging: {
              ignore: (req) => req.url === '/api/health',
            },
          },
        };
      },
    }),
  ],
})
export class LoggingModule {}
