import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthProvider } from '@prisma/client';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators';
import { safeEqual } from '../../common/utils/crypto.util';
import { AppConfigService } from '../../config/config.module';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';
import { TokenService } from './token.service';

const STATE_COOKIE = 'kmg_oauth_state';

/**
 * Social sign-in. Both providers are optional: the routes 404 until the matching
 * `*_CLIENT_ID` / `*_CLIENT_SECRET` are configured (`GET /auth/providers` tells
 * the web app which buttons to render).
 */
@ApiTags('Auth')
@Controller('auth')
export class OAuthController {
  constructor(
    private readonly oauth: OAuthService,
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Get('google')
  @ApiOperation({ summary: 'Start Google sign-in (302 to Google)' })
  google(@Query('next') next: string | undefined, @Res() response: Response): void {
    this.start('GOOGLE', next, response);
  }

  @Public()
  @Get('linkedin')
  @ApiOperation({ summary: 'Start LinkedIn sign-in (302 to LinkedIn)' })
  linkedin(@Query('next') next: string | undefined, @Res() response: Response): void {
    this.start('LINKEDIN', next, response);
  }

  @Public()
  @Get('google/callback')
  @ApiExcludeEndpoint()
  googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    return this.callback('GOOGLE', code, state, request, response);
  }

  @Public()
  @Get('linkedin/callback')
  @ApiExcludeEndpoint()
  linkedinCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    return this.callback('LINKEDIN', code, state, request, response);
  }

  private start(provider: AuthProvider, next: string | undefined, response: Response): void {
    const state = this.oauth.createState(next);
    response.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      secure: this.config.cookie.secure,
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: 10 * 60_000,
    });
    response.redirect(this.oauth.authorizeUrl(provider, state));
  }

  private async callback(
    provider: AuthProvider,
    code: string | undefined,
    state: string | undefined,
    request: Request,
    response: Response,
  ): Promise<void> {
    const cookies = (request as Request & { cookies?: Record<string, string> }).cookies ?? {};
    response.clearCookie(STATE_COOKIE, { path: '/api/v1/auth' });

    const failure = (reason: string) =>
      response.redirect(`${this.config.webUrl}/login?error=${encodeURIComponent(reason)}`);

    if (!code || !state || !cookies[STATE_COOKIE] || !safeEqual(cookies[STATE_COOKIE], state)) {
      failure('invalid_state');
      return;
    }

    try {
      const profile = await this.oauth.fetchProfile(provider, code);
      const userId = await this.oauth.resolveUser(provider, profile);
      const result = await this.auth.issueSession(userId, request);
      this.tokens.setAuthCookies(response, result.refresh.token, result.refresh.expiresAt);

      const { next } = this.oauth.readState(state);
      const target = new URL(`${this.config.webUrl}/auth/callback`);
      if (next) target.searchParams.set('next', next);
      response.redirect(target.toString());
    } catch {
      failure('sign_in_failed');
    }
  }
}
