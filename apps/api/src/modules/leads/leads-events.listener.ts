import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ROLES } from '@kmg/shared';
import { AppConfigService } from '../../config/config.module';
import { MailService } from '../../infrastructure/mail/mail.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { EVENTS, type LeadAssignedPayload, type LeadCreatedPayload } from '../events/event-names';
import { NotificationsService } from '../notifications/notifications.service';

/** Emails + in-app notifications triggered by lead lifecycle events. */
@Injectable()
export class LeadsEventsListener {
  private readonly logger = new Logger(LeadsEventsListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    private readonly config: AppConfigService,
  ) {}

  @OnEvent(EVENTS.LEAD_CREATED, { async: true })
  async onLeadCreated(payload: LeadCreatedPayload): Promise<void> {
    const lead = await this.prisma.contactLead.findUnique({ where: { id: payload.leadId } });
    if (!lead) return;

    const leadUrl = `${this.config.webUrl}/admin/leads/${lead.id}`;
    const notifyAddresses = await this.mail.notifyAddresses();

    if (notifyAddresses.length) {
      this.mail.queueTemplate({
        to: notifyAddresses,
        templateKey: 'contact.received.admin',
        variables: {
          name: lead.name,
          email: lead.email,
          company: lead.company,
          phone: lead.phone,
          serviceInterest: lead.serviceInterest,
          message: lead.message,
          source: lead.source,
          leadUrl,
        },
      });
    }

    this.mail.queueTemplate({
      to: lead.email,
      templateKey: 'contact.received.visitor',
      variables: { name: lead.name },
    });

    const notified = await this.notifications.notifyRoles([ROLES.SALES, ROLES.SUPER_ADMIN], {
      type: 'NEW_LEAD',
      title: 'New contact enquiry',
      body: `${lead.name} sent a new enquiry${lead.serviceInterest ? ` about ${lead.serviceInterest}` : ''}.`,
      link: `/admin/leads/${lead.id}`,
    });
    this.logger.log(`Lead ${lead.id} created — notified ${notified} staff member(s)`);
  }

  @OnEvent(EVENTS.LEAD_ASSIGNED, { async: true })
  async onLeadAssigned(payload: LeadAssignedPayload): Promise<void> {
    const [lead, assignee] = await Promise.all([
      this.prisma.contactLead.findUnique({ where: { id: payload.leadId } }),
      this.prisma.user.findUnique({ where: { id: payload.assigneeId } }),
    ]);
    if (!lead || !assignee) return;

    const leadUrl = `${this.config.webUrl}/admin/leads/${lead.id}`;
    this.mail.queueTemplate({
      to: assignee.email,
      templateKey: 'lead.assigned',
      variables: {
        assigneeName: assignee.name,
        leadName: lead.name,
        leadEmail: lead.email,
        serviceInterest: lead.serviceInterest,
        message: lead.message,
        leadUrl,
      },
    });

    await this.notifications.create(assignee.id, {
      type: 'LEAD_ASSIGNED',
      title: 'A lead was assigned to you',
      body: `${lead.name} was assigned to you for follow-up.`,
      link: `/admin/leads/${lead.id}`,
    });
  }
}
