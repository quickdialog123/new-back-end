import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  jwtPayloadSchema,
  type JwtPayload,
} from '@quickdialog/auth/schemas/jwt-payload.schema.js';
import type { AuthenticatedUser } from '@quickdialog/auth/types/authenticated-user.type.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // extract jwt from header bear token
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('auth.accessToken.secret'), // get secret from .env
      issuer: configService.getOrThrow<string>('auth.accessToken.issuer'),
      audience: configService.getOrThrow<string>('auth.accessToken.audience'),
      algorithms: ['HS256'],
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    const parsed = jwtPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      throw new UnauthorizedException();
    }

    return {
      userId: parsed.data.sub,
      sessionId: parsed.data.sid,
      hotelId: parsed.data.hotelId,
      role: parsed.data.role,
    };
  }
}
