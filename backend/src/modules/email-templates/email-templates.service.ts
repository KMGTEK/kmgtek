import { Injectable, NotFoundException } from '@nestjs/common';
import type { EmailTemplate as EmailTemplateDto, EmailTemplateUpdateInput } from '@kmg/shared';
import { MailService } from '../../infrastructure/mail/mail.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

const toDto = (row: {
  id: string;
  key: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
  updatedAt: Date;
}): EmailTemplateDto => ({
  id: row.id,
  key: row.key,
  name: row.name,
  subject: row.subject,
  html: row.html,
  variables: row.variables,
  updatedAt: row.updatedAt.toISOString(),
});

@Injectable()
export class EmailTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async list(): Promise<EmailTemplateDto[]> {
    const rows = await this.prisma.emailTemplate.findMany({ orderBy: { key: 'asc' } });
    return rows.map(toDto);
  }

  async get(id: string): Promise<EmailTemplateDto> {
    const row = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Email template not found');
    return toDto(row);
  }

  async update(id: string, input: EmailTemplateUpdateInput): Promise<EmailTemplateDto> {
    const existing = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Email template not found');

    const row = await this.prisma.emailTemplate.update({
      where: { id },
      data: { subject: input.subject, html: input.html },
    });
    this.mail.invalidate(row.key);
    return toDto(row);
  }

  /** Render the template with placeholder values and send it to one address. */
  async sendTest(id: string, to: string): Promise<boolean> {
    const template = await this.get(id);
    const variables = Object.fromEntries(
      template.variables.map((variable) => [variable, `{{${variable}}}`]),
    );
    return this.mail.sendTemplate({
      to,
      templateKey: template.key as Parameters<MailService['sendTemplate']>[0]['templateKey'],
      variables: { ...variables, name: 'Test Recipient', email: to },
    });
  }
}
