import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { interviewFeedbackSchema, interviewUpsertSchema, type Interview, type Paginated } from '@kmg/shared';
import type { z } from 'zod';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { paginate, parsePagination } from '../../common/utils/pagination.util';
import { AppEventsService } from '../events/app-events.service';
import { EVENTS } from '../events/event-names';
import { INTERVIEW_INCLUDE, INTERVIEW_INCLUDE_WITH_APPLICATION, toInterview, type InterviewRow } from './interviews.mapper';
import { MeetingProviderService } from './meeting-provider.service';

export type InterviewUpsertData = z.output<typeof interviewUpsertSchema>;
export type InterviewUpdateData = Partial<InterviewUpsertData>;
export type InterviewFeedbackData = z.output<typeof interviewFeedbackSchema>;

export interface InterviewListQuery {
  [key: string]: unknown;
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  status?: string;
  interviewerId?: string;
  applicationId?: string;
  mine?: boolean;
  currentUserId?: string;
}

@Injectable()
export class InterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: AppEventsService,
    private readonly meetingProvider: MeetingProviderService,
  ) {}

  async list(query: InterviewListQuery): Promise<Paginated<Interview>> {
    const { page, pageSize, skip, take } = parsePagination(query);
    const where: Prisma.InterviewWhereInput = {
      ...(query.status ? { status: query.status as Interview['status'] } : {}),
      ...(query.applicationId ? { applicationId: query.applicationId } : {}),
      ...(query.from || query.to
        ? { scheduledAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
        : {}),
      ...(query.interviewerId ? { interviewers: { some: { userId: query.interviewerId } } } : {}),
      ...(query.mine && query.currentUserId ? { interviewers: { some: { userId: query.currentUserId } } } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.interview.findMany({
        where,
        skip,
        take,
        orderBy: { scheduledAt: 'asc' },
        include: INTERVIEW_INCLUDE_WITH_APPLICATION,
      }),
      this.prisma.interview.count({ where }),
    ]);
    return paginate(rows.map((row) => toInterview(row as InterviewRow)), total, { page, pageSize });
  }

  async get(id: string): Promise<Interview> {
    const interview = await this.prisma.interview.findUnique({ where: { id }, include: INTERVIEW_INCLUDE_WITH_APPLICATION });
    if (!interview) throw new NotFoundException('Interview not found');
    return toInterview(interview as InterviewRow);
  }

  async create(dto: InterviewUpsertData, userId: string): Promise<Interview> {
    const application = await this.prisma.jobApplication.findFirst({ where: { id: dto.applicationId, deletedAt: null } });
    if (!application) throw new BadRequestException('Application not found');

    const meetingUrl = dto.meetingUrl ?? (dto.generateMeetingLink ? await this.meetingProvider.generateLink() : undefined);

    const interview = await this.prisma.interview.create({
      data: {
        applicationId: dto.applicationId,
        title: dto.title,
        round: dto.round,
        status: dto.status,
        scheduledAt: dto.scheduledAt,
        durationMinutes: dto.durationMinutes,
        timezone: dto.timezone,
        meetingUrl: meetingUrl ?? null,
        location: dto.location ?? null,
        notes: dto.notes ?? null,
        createdById: userId,
        interviewers: { create: dto.interviewerIds.map((interviewerId) => ({ userId: interviewerId })) },
      },
      include: INTERVIEW_INCLUDE_WITH_APPLICATION,
    });

    this.events.emit(EVENTS.INTERVIEW_SCHEDULED, { interviewId: interview.id });
    return toInterview(interview as InterviewRow);
  }

  async update(id: string, dto: InterviewUpdateData): Promise<Interview> {
    const existing = await this.prisma.interview.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Interview not found');

    const isReschedule = dto.scheduledAt !== undefined && dto.scheduledAt.getTime() !== existing.scheduledAt.getTime();
    const meetingUrl =
      dto.meetingUrl ?? (!existing.meetingUrl && dto.generateMeetingLink ? await this.meetingProvider.generateLink() : undefined);

    await this.prisma.interview.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.round !== undefined ? { round: dto.round } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.scheduledAt !== undefined ? { scheduledAt: dto.scheduledAt } : {}),
        ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
        ...(meetingUrl !== undefined ? { meetingUrl } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });

    if (dto.interviewerIds !== undefined) {
      await this.prisma.$transaction([
        this.prisma.interviewInterviewer.deleteMany({ where: { interviewId: id } }),
        this.prisma.interviewInterviewer.createMany({
          data: dto.interviewerIds.map((interviewerId) => ({ interviewId: id, userId: interviewerId })),
        }),
      ]);
    }

    if (isReschedule) this.events.emit(EVENTS.INTERVIEW_SCHEDULED, { interviewId: id });
    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.interview.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Interview not found');
    await this.prisma.interview.delete({ where: { id } });
  }

  async submitFeedback(interviewId: string, interviewerId: string, dto: InterviewFeedbackData): Promise<Interview> {
    const interview = await this.prisma.interview.findUnique({ where: { id: interviewId } });
    if (!interview) throw new NotFoundException('Interview not found');

    await this.prisma.interviewFeedback.upsert({
      where: { interviewId_interviewerId: { interviewId, interviewerId } },
      create: {
        interviewId,
        interviewerId,
        rating: dto.rating,
        decision: dto.decision,
        strengths: dto.strengths ?? null,
        weaknesses: dto.weaknesses ?? null,
        comments: dto.comments,
      },
      update: {
        rating: dto.rating,
        decision: dto.decision,
        strengths: dto.strengths ?? null,
        weaknesses: dto.weaknesses ?? null,
        comments: dto.comments,
      },
    });
    return this.get(interviewId);
  }

  /** Used by the recruitment events listener to render the ICS + email. */
  async getForNotification(interviewId: string): Promise<InterviewRow | null> {
    return this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: INTERVIEW_INCLUDE_WITH_APPLICATION,
    }) as unknown as Promise<InterviewRow | null>;
  }
}
