import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';

import { AuthService } from './auth.service.js';
import { loginRequestSchema, type LoginDTO } from './schemas/login.schema.js';
import type { AuthenticatedUser } from './types/authenticated-user.type.js';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiLoginDocs,
  ApiLogoutAllDocs,
  ApiLogoutDocs,
  ApiMeDocs,
  ApiRefreshDocs,
} from '@quickdialog/swagger/decorators/auth.decorator.js';
import { durationToMs } from './auth.utils.js';

const REFRESH_TOKEN_COOKIE = 'refresh_token';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @ApiLoginDocs()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body({ schema: loginRequestSchema }) input: LoginDTO,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(
      input,
      this.requestMetadata(request),
    );

    response.setCookie(
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      this.refreshCookieOptions(),
    );

    return { accessToken };
  }

  @Public()
  @ApiRefreshDocs()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const { accessToken, refreshToken } = await this.authService.refresh(
      request.cookies[REFRESH_TOKEN_COOKIE],
      this.requestMetadata(request),
    );

    response.setCookie(
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      this.refreshCookieOptions(),
    );

    return { accessToken };
  }

  @Get('me')
  @ApiMeDocs()
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @ApiLogoutDocs()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<void> {
    await this.authService.logout(request.cookies[REFRESH_TOKEN_COOKIE]);
    response.clearCookie(REFRESH_TOKEN_COOKIE, this.refreshCookieOptions());
  }

  @ApiLogoutAllDocs()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout-all')
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<void> {
    await this.authService.logoutAll(user.userId);
    response.clearCookie(REFRESH_TOKEN_COOKIE, this.refreshCookieOptions());
  }

  private refreshCookieOptions() {
    const prefix = this.config.getOrThrow<string>('app.prefix');
    const ttl = this.config.getOrThrow<string>('auth.refreshToken.ttl');

    return {
      httpOnly: true,
      secure: this.config.getOrThrow<string>('app.nodeEnv') === 'production',
      sameSite: 'lax' as const,
      path: `/${prefix}/auth`,
      maxAge: durationToMs(ttl) / 1000,
    };
  }

  private requestMetadata(request: FastifyRequest) {
    const userAgent = request.headers['user-agent'];

    return {
      ipAddress: request.ip,
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
    };
  }
}
