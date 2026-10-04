import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ContactInput } from '@kmg/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AppEventsService } from '../events/app-events.service';
import { EVENTS } from '../events/event-names';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: AppEventsService,
  ) {}

  /**
   * Create a contact lead. Honeypot (`website`) filled → log it and pretend
   * success without writing a row, per the anti-spam contract.
   */
  async createFromContactForm(
    input: ContactInput,
    context: { ip?: string | null; userAgent?: string | null },
  ): Promise<{ id: string | null }> {
    if (input.website) {
      this.logger.warn(`Honeypot triggered on /contact from ip=${context.ip ?? 'unknown'}`);
      return { id: null };
    }

    const lead = await this.prisma.contactLead.create({
      data: {
        name: input.name,
        email: input.email,
        company: input.company ?? null,
        phone: input.phone ?? null,
        country: input.country ?? null,
        serviceInterest: input.serviceInterest ?? null,
        message: input.message,
        source: input.source ?? 'contact-form',
        ip: context.ip ?? null,
        userAgent: context.userAgent ?? null,
      },
    });

    this.events.emit(EVENTS.LEAD_CREATED, { leadId: lead.id });
    return { id: lead.id };
  }
}
