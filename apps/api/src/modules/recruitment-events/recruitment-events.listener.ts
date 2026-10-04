import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { FileObject } from '@prisma/client';
import { APPLICATION_STATUS_LABELS } from '@kmg/shared';
import { AppConfigService } from '../../config/config.module';
import { buildIcsEvent } from '../../common/utils/ics.util';
import { MailService } from '../../infrastructure/mail/mail.service';
import type { MailAttachment } from '../../infrastructure/mail/mail.types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import {
  EVENTS,
  type ApplicationCreatedPayload,
  type ApplicationStatusChangedPayload,
  type InterviewScheduledPayload,
} from '../events/event-names';
import { NotificationsService } from '../notifications/notifications.service';

/** Mail + in-app notifications for the recruitment domain events. */
@Injectable()
export class RecruitmentEventsListener {
  private readonly logger = new Logger(RecruitmentEventsListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    private readonly config: AppConfigService,
    private readonly storage: StorageService,
  ) {}

  /** Fetch a stored file's bytes as a mail attachment. Never throws — logs and skips instead. */
  private async toAttachment(file: FileObject | null): Promise<MailAttachment | null> {
    if (!file) return null;
    try {
      const buffer = await this.storage.get(file.key, file.visibility);
      return { filename: file.originalName, content: buffer, contentType: file.mimeType };
    } catch (error) {
      this.logger.error(`Could not attach file ${file.id} to notification email`, error as Error);
      return null;
    }
  }

  @OnEvent(EVENTS.APPLICATION_CREATED, { async: true })
  async onApplicationCreated(payload: ApplicationCreatedPayload): Promise<void> {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: payload.applicationId },
      include: { job: true, candidate: { include: { user: true } }, resume: true, coverLetter: true },
    });
    if (!application) return;

    const portalUrl = `${this.config.webUrl}/portal/applications/${application.id}`;
    this.mail.queueTemplate({
      to: application.candidate.user.email,
      templateKey: 'application.received.candidate',
      variables: {
        name: application.candidate.user.name,
        jobTitle: application.job.title,
        jobLocation: application.job.location,
        applicationId: application.id,
        portalUrl,
      },
    });

    const notifyAddresses = await this.mail.notifyAddresses();
    if (notifyAddresses.length) {
      const attachments = (
        await Promise.all([this.toAttachment(application.resume), this.toAttachment(application.coverLetter)])
      ).filter((attachment): attachment is MailAttachment => attachment !== null);

      this.mail.queueTemplate({
        to: notifyAddresses,
        templateKey: 'application.received.admin',
        variables: {
          jobTitle: application.job.title,
          candidateName: application.candidate.user.name,
          candidateEmail: application.candidate.user.email,
          candidatePhone: application.phone,
          candidateLocation: application.currentLocation,
          experienceYears: application.experienceYears,
          source: application.source ?? 'careers-page',
          applicationUrl: `${this.config.webUrl}/admin/applications/${application.id}`,
        },
        attachments: attachments.length ? attachments : undefined,
      });
    }

    await this.notifications.notifyRoles(['RECRUITER', 'HR'], {
      type: 'APPLICATION_RECEIVED',
      title: 'New job application',
      body: `${application.candidate.user.name} applied for ${application.job.title}`,
      link: `/admin/applications/${application.id}`,
    });
  }

  @OnEvent(EVENTS.APPLICATION_STATUS_CHANGED, { async: true })
  async onApplicationStatusChanged(payload: ApplicationStatusChangedPayload): Promise<void> {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: payload.applicationId },
      include: { job: true, candidate: { include: { user: true } } },
    });
    if (!application) return;

    const portalUrl = `${this.config.webUrl}/portal/applications/${application.id}`;

    if (payload.notifyCandidate !== false) {
      if (payload.to === 'OFFER') {
        this.mail.queueTemplate({
          to: application.candidate.user.email,
          templateKey: 'offer.released',
          variables: { name: application.candidate.user.name, jobTitle: application.job.title, portalUrl },
        });
      } else {
        this.mail.queueTemplate({
          to: application.candidate.user.email,
          templateKey: 'application.status_updated',
          variables: {
            name: application.candidate.user.name,
            jobTitle: application.job.title,
            status: payload.to,
            statusLabel: APPLICATION_STATUS_LABELS[payload.to],
            note: payload.note ?? null,
            portalUrl,
          },
        });
      }
    }

    await this.notifications.create(application.candidate.userId, {
      type: payload.to === 'OFFER' ? 'OFFER_RELEASED' : 'APPLICATION_STATUS_UPDATED',
      title: payload.to === 'OFFER' ? 'You have an offer!' : 'Your application status changed',
      body: `${application.job.title}: ${APPLICATION_STATUS_LABELS[payload.to]}`,
      link: `/portal/applications/${application.id}`,
    });
  }

  @OnEvent(EVENTS.INTERVIEW_SCHEDULED, { async: true })
  async onInterviewScheduled(payload: InterviewScheduledPayload): Promise<void> {
    const interview = await this.prisma.interview.findUnique({
      where: { id: payload.interviewId },
      include: {
        interviewers: { include: { user: true } },
        application: { include: { job: true, candidate: { include: { user: true } } } },
      },
    });
    if (!interview?.application) return;

    const { application } = interview;
    const interviewerNames = interview.interviewers.map((i) => i.user.name).join(', ');

    const ics = buildIcsEvent({
      title: `${interview.round} interview — ${application.job.title}`,
      description: interview.notes ?? `Interview for ${application.job.title}`,
      location: interview.location ?? interview.meetingUrl ?? undefined,
      url: interview.meetingUrl ?? undefined,
      start: interview.scheduledAt,
      durationMinutes: interview.durationMinutes,
      organizer: { name: 'KMG Technologies Talent Team', email: this.config.mail.fromAddress },
      attendees: [
        { email: application.candidate.user.email, name: application.candidate.user.name },
        ...interview.interviewers.map((i) => ({ email: i.user.email, name: i.user.name })),
      ],
    });
    const icsAttachment = { filename: 'interview.ics', content: ics, contentType: 'text/calendar; method=REQUEST' };

    const baseVariables = {
      jobTitle: application.job.title,
      round: interview.round,
      scheduledAt: interview.scheduledAt,
      timezone: interview.timezone,
      durationMinutes: interview.durationMinutes,
      interviewers: interviewerNames,
      meetingUrl: interview.meetingUrl,
      location: interview.location,
    };

    this.mail.queueTemplate({
      to: application.candidate.user.email,
      templateKey: 'interview.scheduled',
      variables: { name: application.candidate.user.name, ...baseVariables },
      attachments: [icsAttachment],
    });

    for (const interviewer of interview.interviewers) {
      this.mail.queueTemplate({
        to: interviewer.user.email,
        templateKey: 'interview.scheduled',
        variables: { name: interviewer.user.name, ...baseVariables },
        attachments: [icsAttachment],
      });
    }

    await this.notifications.create(application.candidate.userId, {
      type: 'INTERVIEW_SCHEDULED',
      title: 'Interview scheduled',
      body: `${interview.round} interview for ${application.job.title}`,
      link: `/portal/applications/${application.id}`,
    });

    await Promise.all(
      interview.interviewers.map((i) =>
        this.notifications.create(i.userId, {
          type: 'INTERVIEW_SCHEDULED',
          title: 'Interview scheduled',
          body: `${interview.round} interview with ${application.candidate.user.name} for ${application.job.title}`,
          link: `/admin/interviews/${interview.id}`,
        }),
      ),
    );

    this.logger.log(`interview.scheduled notifications sent for interview ${interview.id}`);
  }
}
