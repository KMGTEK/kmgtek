import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
} from '@kmg/shared';
import type { Request, Response } from 'express';
import { CsrfProtected, CurrentUser, Public, RateLimit } from '../../common/decorators';
import { ApiDataResponse, ApiZodBody } from '../../common/decorators/swagger.decorators';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ok } from '../../common/utils/response.util';
import { AppConfigService } from '../../config/config.module';
import { AuthService, type AuthResult } from './auth.service';
import { TokenService } from './token.service';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(CsrfGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly config: AppConfigService,
  ) {}

  /** Write the refresh cookies and return the `{ data }` envelope. */
  private respond(response: Response, result: AuthResult) {
    this.tokens.setAuthCookies(response, result.refresh.token, result.refresh.expiresAt);
    return ok(result.auth);
  }

  @Public()
  @Post('register')
  @RateLimit(10)
  @ApiZodBody(registerSchema)
  @ApiOperation({ summary: 'Create a candidate account' })
  @ApiDataResponse({ type: 'object' }, 'Access token + user')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.respond(response, await this.auth.register(body, request));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit(10)
  @ApiZodBody(loginSchema)
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiDataResponse({ type: 'object' }, 'Access token + user')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.respond(response, await this.auth.login(body, request));
  }

  @Public()
  @CsrfProtected()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @RateLimit(60)
  @ApiOperation({ summary: 'Rotate the refresh cookie and issue a new access token' })
  @ApiDataResponse({ type: 'object' }, 'Access token + user')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = this.tokens.readRefreshCookie(request);
    if (!token) throw new UnauthorizedException('No session cookie');
    try {
      return this.respond(response, await this.auth.refresh(token, request));
    } catch (error) {
      this.tokens.clearAuthCookies(response);
      throw error;
    }
  }

  @Public()
  @CsrfProtected()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the refresh token and clear cookies' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(this.tokens.readRefreshCookie(request));
    this.tokens.clearAuthCookies(response);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The authenticated user, roles and permissions' })
  @ApiDataResponse({ type: 'object' })
  async me(@CurrentUser('id') userId: string) {
    return ok(await this.auth.me(userId));
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit(5)
  @ApiZodBody(forgotPasswordSchema)
  @ApiOperation({ summary: 'Email a password reset link (always returns 204)' })
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordInput,
  ): Promise<void> {
    await this.auth.forgotPassword(body.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit(10)
  @ApiZodBody(resetPasswordSchema)
  @ApiOperation({ summary: 'Set a new password using a reset token' })
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput,
  ): Promise<void> {
    await this.auth.resetPassword(body.token, body.password);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiZodBody(changePasswordSchema)
  @ApiOperation({ summary: 'Change my password (revokes other sessions)' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
  ): Promise<void> {
    await this.auth.changePassword(userId, body);
  }

  @Public()
  @Get('providers')
  @ApiOperation({ summary: 'Which social logins are configured' })
  @ApiDataResponse({
    type: 'object',
    properties: { google: { type: 'boolean' }, linkedin: { type: 'boolean' } },
  })
  providers() {
    return ok({
      google: Boolean(this.config.oauth.google),
      linkedin: Boolean(this.config.oauth.linkedin),
    });
  }
}
