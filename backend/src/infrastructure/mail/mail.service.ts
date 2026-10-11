import { Injectable, Logger } from '@nestjs/common';
import { COMPANY, DEFAULT_LOGO_URL, type EmailTemplateKey } from '@kmg/shared';
import Handlebars from 'handlebars';
import { AppConfigService } from '../../config/config.module';
import { stripHtml } from '../../common/utils/sanitize.util';
import { PrismaService } from '../prisma/prisma.service';
import { renderLayout } from './mail.layout';
import { MailDriver, type RawMail, type TemplateMail } from './mail.types';

interface CompiledTemplate {
  subject: HandlebarsTemplateDelegate;
  html: HandlebarsTemplateDelegate;
  updatedAt: number;
}

Handlebars.registerHelper('formatDate', (value: unknown) => {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value ?? '')
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
});
Handlebars.registerHelper('formatDateTime', (value: unknown, timezone?: unknown) => {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value ?? '');
  return date.toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: typeof timezone === 'string' ? timezone : 'America/New_York',
  });
});

/**
 * Sends transactional email. Templates live in the `email_templates` table
 * (editable by admins) and are rendered with Handlebars inside the branded layout.
 *
 * ```ts
 * this.mail.sendTemplate({ to: user.email, templateKey: 'auth.password_reset', variables: { name, resetUrl } });
 * ```
 *
 * Delivery is asynchronous and failures are logged (never thrown into a request).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly cache = new Map<string, CompiledTemplate>();
  private readonly cacheTtlMs = 60_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly driver: MailDriver,
  ) {}

  /** Drop the compiled-template cache (called after an admin edits a template). */
  invalidate(key?: string): void {
    if (key) this.cache.delete(key);
    else this.cache.clear();
  }

  /** Staff inbox addresses (settings override the env default). */
  async notifyAddresses(): Promise<string[]> {
    const settings = await this.emailSettings();
    return settings.notifyAddresses.length ? settings.notifyAddresses : this.config.mail.notifyAddresses;
  }

  /** Render + deliver a stored template. Resolves to `true` when delivery succeeded. */
  async sendTemplate(mail: TemplateMail): Promise<boolean> {
    try {
      const compiled = await this.compile(mail.templateKey);
      if (!compiled) {
        this.logger.warn(`Email template "${mail.templateKey}" not found — nothing sent`);
        return false;
      }
      const variables = await this.withDefaults(mail.variables ?? {});
      return await this.deliver({
        to: mail.to,
        cc: mail.cc,
        replyTo: mail.replyTo,
        attachments: mail.attachments,
        templateKey: mail.templateKey,
        subject: compiled.subject(variables),
        html: compiled.html(variables),
      });
    } catch (error) {
      this.logger.error(`Failed to render template ${mail.templateKey}`, error as Error);
      return false;
    }
  }

  /** Deliver an ad-hoc message (already-rendered HTML body, without layout). */
  async sendRaw(mail: RawMail): Promise<boolean> {
    return this.deliver(mail);
  }

  /** Fire-and-forget variant for request handlers and event listeners. */
  queueTemplate(mail: TemplateMail): void {
    void this.sendTemplate(mail).catch((error) =>
      this.logger.error(`Unhandled mail error for ${mail.templateKey}`, error as Error),
    );
  }

  private async deliver(mail: RawMail): Promise<boolean> {
    const settings = await this.emailSettings();
    const recipients = (Array.isArray(mail.to) ? mail.to : [mail.to]).filter(Boolean);
    if (!recipients.length) return false;

    const from = `"${settings.fromName}" <${settings.fromAddress}>`;
    const html = renderLayout(mail.html, {
      title: mail.subject,
      logoUrl: await this.logoUrl(),
      webUrl: this.config.webUrl,
    });

    const log = await this.prisma.emailLog.create({
      data: {
        templateKey: mail.templateKey ?? null,
        to: recipients.join(', '),
        subject: mail.subject,
        status: 'QUEUED',
      },
    });

    try {
      await this.driver.send({
        from,
        to: recipients.join(', '),
        cc: Array.isArray(mail.cc) ? mail.cc.join(', ') : mail.cc,
        replyTo: mail.replyTo,
        subject: mail.subject,
        html,
        text: stripHtml(mail.html),
        attachments: mail.attachments,
      });
      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Email delivery failed (${mail.subject}): ${message}`);
      await this.prisma.emailLog
        .update({ where: { id: log.id }, data: { status: 'FAILED', error: message.slice(0, 1000) } })
        .catch(() => undefined);
      return false;
    }
  }

  private async compile(key: EmailTemplateKey): Promise<CompiledTemplate | null> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.updatedAt < this.cacheTtlMs) return cached;

    const template = await this.prisma.emailTemplate.findUnique({ where: { key } });
    if (!template) return null;

    const compiled: CompiledTemplate = {
      subject: Handlebars.compile(template.subject, { noEscape: false }),
      html: Handlebars.compile(template.html),
      updatedAt: Date.now(),
    };
    this.cache.set(key, compiled);
    return compiled;
  }

  /** Variables every template can rely on. */
  private async withDefaults(variables: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      companyName: COMPANY.displayName,
      companyEmail: COMPANY.email,
      companyAddress: COMPANY.address.full,
      siteUrl: this.config.webUrl,
      year: new Date().getFullYear(),
      ...variables,
    };
  }

  private async emailSettings(): Promise<{
    fromName: string;
    fromAddress: string;
    notifyAddresses: string[];
  }> {
    const row = await this.prisma.websiteSetting
      .findUnique({ where: { group: 'email' } })
      .catch(() => null);
    const value = (row?.value ?? {}) as Record<string, unknown>;
    return {
      fromName: typeof value.fromName === 'string' ? value.fromName : this.config.mail.fromName,
      fromAddress:
        typeof value.fromAddress === 'string' ? value.fromAddress : this.config.mail.fromAddress,
      notifyAddresses: Array.isArray(value.notifyAddresses)
        ? (value.notifyAddresses as string[])
        : this.config.mail.notifyAddresses,
    };
  }

  private async logoUrl(): Promise<string> {
    const row = await this.prisma.websiteSetting
      .findUnique({ where: { group: 'branding' } })
      .catch(() => null);
    const value = (row?.value ?? {}) as Record<string, unknown>;
    const logo = typeof value.logoUrl === 'string' && value.logoUrl ? value.logoUrl : DEFAULT_LOGO_URL;
    return logo.startsWith('http') ? logo : `${this.config.webUrl}${logo}`;
  }
}
