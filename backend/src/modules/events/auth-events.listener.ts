import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppConfigService } from '../../config/config.module';
import { MailService } from '../../infrastructure/mail/mail.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { EVENTS, type PasswordResetRequestedPayload, type UserRegisteredPayload } from './event-names';

/** Transactional emails triggered by identity events. */
@Injectable()
export class AuthEventsListener {
  private readonly logger = new Logger(AuthEventsListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: AppConfigService,
  ) {}

  @OnEvent(EVENTS.USER_PASSWORD_RESET_REQUESTED, { async: true })
  async onPasswordResetRequested(payload: PasswordResetRequestedPayload): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return;
    const resetUrl = `${this.config.webUrl}/reset-password?token=${encodeURIComponent(payload.token)}`;
    await this.mail.sendTemplate({
      to: user.email,
      templateKey: 'auth.password_reset',
      variables: { name: user.name, email: user.email, resetUrl, expiresInMinutes: 60 },
    });
    this.logger.log(`Password reset email queued for ${user.email}`);
  }

  @OnEvent(EVENTS.USER_REGISTERED, { async: true })
  async onUserRegistered(payload: UserRegisteredPayload): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return;
    await this.mail.sendTemplate({
      to: user.email,
      templateKey: 'auth.welcome',
      variables: {
        name: user.name,
        email: user.email,
        portalUrl: `${this.config.webUrl}/portal`,
        jobsUrl: `${this.config.webUrl}/careers`,
      },
    });
  }
}
