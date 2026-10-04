import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { AuthProvider } from '@prisma/client';
import { ROLES } from '@kmg/shared';
import { randomToken } from '../../common/utils/crypto.util';
import { AppConfigService } from '../../config/config.module';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

export interface OAuthProfile {
  providerAccountId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  emailVerified: boolean;
}

interface ProviderEndpoints {
  authorize: string;
  token: string;
  userinfo: string;
  scope: string;
}

const ENDPOINTS: Record<AuthProvider, ProviderEndpoints> = {
  GOOGLE: {
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    userinfo: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile',
  },
  LINKEDIN: {
    authorize: 'https://www.linkedin.com/oauth/v2/authorization',
    token: 'https://www.linkedin.com/oauth/v2/accessToken',
    userinfo: 'https://api.linkedin.com/v2/userinfo',
    scope: 'openid profile email',
  },
};

/**
 * Google / LinkedIn sign-in implemented as a plain OpenID Connect authorization
 * code flow — each provider is enabled only when its client id/secret are set.
 */
@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  isEnabled(provider: AuthProvider): boolean {
    return Boolean(this.credentials(provider));
  }

  private credentials(provider: AuthProvider) {
    return provider === 'GOOGLE' ? this.config.oauth.google : this.config.oauth.linkedin;
  }

  private requireCredentials(provider: AuthProvider) {
    const credentials = this.credentials(provider);
    if (!credentials) throw new NotFoundException(`${provider} sign-in is not configured`);
    return credentials;
  }

  /** Opaque state value stored in a short-lived cookie and echoed by the provider. */
  createState(next?: string): string {
    return Buffer.from(JSON.stringify({ n: randomToken(12), next: next ?? '' })).toString('base64url');
  }

  readState(state: string): { next?: string } {
    try {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      const next = typeof parsed.next === 'string' && parsed.next.startsWith('/') ? parsed.next : undefined;
      return { next };
    } catch {
      return {};
    }
  }

  authorizeUrl(provider: AuthProvider, state: string): string {
    const credentials = this.requireCredentials(provider);
    const endpoints = ENDPOINTS[provider];
    const url = new URL(endpoints.authorize);
    url.searchParams.set('client_id', credentials.clientId);
    url.searchParams.set('redirect_uri', credentials.callbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', endpoints.scope);
    url.searchParams.set('state', state);
    if (provider === 'GOOGLE') {
      url.searchParams.set('access_type', 'online');
      url.searchParams.set('prompt', 'select_account');
    }
    return url.toString();
  }

  /** Exchange the authorization code and load the provider's user profile. */
  async fetchProfile(provider: AuthProvider, code: string): Promise<OAuthProfile> {
    const credentials = this.requireCredentials(provider);
    const endpoints = ENDPOINTS[provider];

    const tokenResponse = await fetch(endpoints.token, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        redirect_uri: credentials.callbackUrl,
      }),
    });
    if (!tokenResponse.ok) {
      this.logger.warn(`${provider} token exchange failed: ${tokenResponse.status}`);
      throw new BadRequestException('Social sign-in failed');
    }
    const tokens = (await tokenResponse.json()) as { access_token?: string };
    if (!tokens.access_token) throw new BadRequestException('Social sign-in failed');

    const profileResponse = await fetch(endpoints.userinfo, {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileResponse.ok) throw new BadRequestException('Social sign-in failed');

    const profile = (await profileResponse.json()) as Record<string, unknown>;
    const email = String(profile.email ?? '').toLowerCase();
    if (!email) throw new BadRequestException('Your social account does not expose an email address');

    return {
      providerAccountId: String(profile.sub ?? profile.id ?? email),
      email,
      name: String(profile.name ?? `${profile.given_name ?? ''} ${profile.family_name ?? ''}`).trim() || email,
      avatarUrl: typeof profile.picture === 'string' ? profile.picture : null,
      emailVerified: profile.email_verified !== false,
    };
  }

  /**
   * Link the provider account to an existing user, or create a CANDIDATE account.
   * Returns the user id so the caller can mint a session.
   */
  async resolveUser(provider: AuthProvider, profile: OAuthProfile): Promise<string> {
    const linked = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: { provider, providerAccountId: profile.providerAccountId },
      },
    });
    if (linked) return linked.userId;

    const existing = await this.prisma.user.findFirst({
      where: { email: profile.email, deletedAt: null },
    });
    if (existing) {
      await this.prisma.oAuthAccount.create({
        data: { userId: existing.id, provider, providerAccountId: profile.providerAccountId },
      });
      await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          status: existing.status === 'INVITED' ? 'ACTIVE' : existing.status,
          emailVerifiedAt: existing.emailVerifiedAt ?? (profile.emailVerified ? new Date() : null),
          avatarUrl: existing.avatarUrl ?? profile.avatarUrl ?? null,
          lastLoginAt: new Date(),
        },
      });
      return existing.id;
    }

    const candidateRole = await this.prisma.role.findUnique({ where: { name: ROLES.CANDIDATE } });
    if (!candidateRole) throw new Error('CANDIDATE role is missing — run the database seed');

    const created = await this.prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl ?? null,
        status: 'ACTIVE',
        emailVerifiedAt: profile.emailVerified ? new Date() : null,
        lastLoginAt: new Date(),
        roles: { create: { roleId: candidateRole.id } },
        candidate: { create: {} },
        oauthAccounts: { create: { provider, providerAccountId: profile.providerAccountId } },
      },
    });
    return created.id;
  }
}
