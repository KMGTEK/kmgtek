import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  applicationBulkSchema,
  applicationStatusUpdateSchema,
  noteSchema,
  ratingSchema,
  type ApplicationStatus,
  type Interview,
  type JobApplication,
  type Paginated,
} from '@kmg/shared';
import type { z } from 'zod';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { toCsv } from '../../common/utils/csv.util';
import { paginate, parsePagination } from '../../common/utils/pagination.util';
import { UploadsService } from '../uploads/uploads.service';
import { AppEventsService } from '../events/app-events.service';
import { EVENTS } from '../events/event-names';
import { CandidatesService } from '../candidates/candidates.service';
import { INTERVIEW_INCLUDE, toInterview, type InterviewRow } from '../interviews/interviews.mapper';
import { APPLICATION_INCLUDE, toApplicationNote, toJobApplication, toStatusHistoryEntry, type ApplicationRow } from './applications.mapper';

export type ApplicationStatusUpdateData = z.output<typeof applicationStatusUpdateSchema>;
export type ApplicationBulkData = z.output<typeof applicationBulkSchema>;
export type NoteData = z.output<typeof noteSchema>;
export type RatingData = z.output<typeof ratingSchema>;

const TERMINAL_STATUSES: ApplicationStatus[] = ['JOINED', 'REJECTED', 'WITHDRAWN'];

export interface AdminApplicationListQuery {
  [key: string]: unknown;
  page?: number;
  pageSize?: number;
  sort?: string;
  jobId?: string;
  status?: string;
  minRating?: number;
  source?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly events: AppEventsService,
    private readonly candidates: CandidatesService,
  ) {}

  /* ------------------------------- Candidate ------------------------------ */

  async listMine(candidateId: string, query: { page?: number; pageSize?: number; status?: string }): Promise<Paginated<JobApplication>> {
    const { page, pageSize, skip, take } = parsePagination(query);
    const where: Prisma.JobApplicationWhereInput = {
      candidateId,
      deletedAt: null,
      ...(query.status ? { status: query.status as ApplicationStatus } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.jobApplication.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: APPLICATION_INCLUDE }),
      this.prisma.jobApplication.count({ where }),
    ]);
    return paginate(rows.map((row) => toJobApplication(row as ApplicationRow, this.uploads)), total, { page, pageSize });
  }

  async getMine(candidateId: string, id: string): Promise<JobApplication> {
    const row = await this.prisma.jobApplication.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...APPLICATION_INCLUDE,
        history: { include: { changedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        interviews: {
          where: { status: 'SCHEDULED', scheduledAt: { gte: new Date() } },
          include: INTERVIEW_INCLUDE,
          orderBy: { scheduledAt: 'asc' },
        },
      },
    });
    if (!row) throw new NotFoundException('Application not found');
    if (row.candidateId !== candidateId) throw new ForbiddenException('Not your application');

    const dto = toJobApplication(row as ApplicationRow, this.uploads);
    // Candidates should not see interviewer feedback before it's finalized.
    dto.interviews = dto.interviews?.map((interview) => ({ ...interview, feedback: [] }));
    return dto;
  }

  async withdraw(candidateId: string, id: string): Promise<JobApplication> {
    const row = await this.prisma.jobApplication.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new NotFoundException('Application not found');
    if (row.candidateId !== candidateId) throw new ForbiddenException('Not your application');
    if (TERMINAL_STATUSES.includes(row.status)) {
      throw new BadRequestException(`Application is already ${row.status.toLowerCase()}`);
    }

    await this.prisma.$transaction([
      this.prisma.jobApplication.update({ where: { id }, data: { status: 'WITHDRAWN' } }),
      this.prisma.applicationStatusHistory.create({
        data: { applicationId: id, fromStatus: row.status, toStatus: 'WITHDRAWN', note: 'Withdrawn by candidate' },
      }),
    ]);
    return this.getMine(candidateId, id);
  }

  async dashboard(candidateId: string): Promise<{
    applications: number;
    active: number;
    interviews: number;
    savedJobs: number;
    profileCompleteness: number;
    recentApplications: JobApplication[];
    upcomingInterviews: Interview[];
  }> {
    const [applications, active, interviews, savedJobs, profile, recentRows, upcomingRows] = await Promise.all([
      this.prisma.jobApplication.count({ where: { candidateId, deletedAt: null } }),
      this.prisma.jobApplication.count({ where: { candidateId, deletedAt: null, status: { notIn: TERMINAL_STATUSES } } }),
      this.prisma.interview.count({
        where: { status: 'SCHEDULED', scheduledAt: { gte: new Date() }, application: { candidateId, deletedAt: null } },
      }),
      this.prisma.savedJob.count({ where: { candidateId } }),
      this.candidates.getProfile(candidateId),
      this.prisma.jobApplication.findMany({
        where: { candidateId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: APPLICATION_INCLUDE,
      }),
      this.prisma.interview.findMany({
        where: { status: 'SCHEDULED', scheduledAt: { gte: new Date() }, application: { candidateId, deletedAt: null } },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        include: INTERVIEW_INCLUDE,
      }),
    ]);

    return {
      applications,
      active,
      interviews,
      savedJobs,
      profileCompleteness: profile.profileCompleteness,
      recentApplications: recentRows.map((row) => toJobApplication(row as ApplicationRow, this.uploads)),
      upcomingInterviews: upcomingRows.map((row) => toInterview(row as InterviewRow)),
    };
  }

  /* --------------------------------- Admin -------------------------------- */

  async listAdmin(query: AdminApplicationListQuery): Promise<Paginated<JobApplication>> {
    const { page, pageSize, skip, take } = parsePagination(query);
    const where = this.buildAdminWhere(query);
    const orderBy = this.parseAdminSort(query.sort);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.jobApplication.findMany({ where, skip, take, orderBy, include: APPLICATION_INCLUDE }),
      this.prisma.jobApplication.count({ where }),
    ]);
    return paginate(rows.map((row) => toJobApplication(row as ApplicationRow, this.uploads)), total, { page, pageSize });
  }

  private buildAdminWhere(query: AdminApplicationListQuery): Prisma.JobApplicationWhereInput {
    return {
      deletedAt: null,
      ...(query.jobId ? { jobId: query.jobId } : {}),
      ...(query.status ? { status: query.status as ApplicationStatus } : {}),
      ...(query.minRating !== undefined ? { rating: { gte: Number(query.minRating) } } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.from || query.to
        ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
        : {}),
    };
  }

  private parseAdminSort(sort?: string): Prisma.JobApplicationOrderByWithRelationInput {
    const allowed = ['createdAt', 'rating', 'experienceYears', 'status'] as const;
    if (!sort) return { createdAt: 'desc' };
    const [field, direction] = sort.split(':');
    if (!allowed.includes(field as (typeof allowed)[number])) return { createdAt: 'desc' };
    return { [field]: direction?.toLowerCase() === 'asc' ? 'asc' : 'desc' };
  }

  async getAdmin(id: string): Promise<JobApplication> {
    const row = await this.prisma.jobApplication.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...APPLICATION_INCLUDE,
        notes: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        history: { include: { changedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        interviews: { include: INTERVIEW_INCLUDE, orderBy: { scheduledAt: 'desc' } },
      },
    });
    if (!row) throw new NotFoundException('Application not found');
    return toJobApplication(row as ApplicationRow, this.uploads);
  }

  private async requireAlive(id: string) {
    const row = await this.prisma.jobApplication.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new NotFoundException('Application not found');
    return row;
  }

  async updateStatus(id: string, dto: ApplicationStatusUpdateData, actorId: string): Promise<JobApplication> {
    const existing = await this.requireAlive(id);

    await this.prisma.$transaction([
      this.prisma.jobApplication.update({
        where: { id },
        data: { status: dto.status, ...(dto.status === 'JOINED' ? { hiredAt: new Date() } : {}) },
      }),
      this.prisma.applicationStatusHistory.create({
        data: { applicationId: id, fromStatus: existing.status, toStatus: dto.status, note: dto.note ?? null, changedById: actorId },
      }),
    ]);

    this.events.emit(EVENTS.APPLICATION_STATUS_CHANGED, {
      applicationId: id,
      from: existing.status,
      to: dto.status,
      note: dto.note ?? null,
      notifyCandidate: dto.notifyCandidate,
    });

    return this.getAdmin(id);
  }

  async updateRating(id: string, dto: RatingData): Promise<JobApplication> {
    await this.requireAlive(id);
    await this.prisma.jobApplication.update({ where: { id }, data: { rating: dto.rating } });
    return this.getAdmin(id);
  }

  async addNote(id: string, authorId: string, dto: NoteData) {
    await this.requireAlive(id);
    const note = await this.prisma.applicationNote.create({
      data: { applicationId: id, authorId, content: dto.content },
      include: { author: { select: { id: true, name: true } } },
    });
    return toApplicationNote(note);
  }

  async getResumeFileId(id: string): Promise<string> {
    const row = await this.requireAlive(id);
    if (!row.resumeFileId) throw new NotFoundException('No resume on file for this application');
    return row.resumeFileId;
  }

  async bulk(dto: ApplicationBulkData): Promise<{ affected: number } | string> {
    const where: Prisma.JobApplicationWhereInput = { id: { in: dto.ids }, deletedAt: null };

    if (dto.action === 'status') {
      if (!dto.status) throw new BadRequestException('status is required for a status action');
      const rows = await this.prisma.jobApplication.findMany({ where });
      await this.prisma.$transaction([
        this.prisma.jobApplication.updateMany({ where, data: { status: dto.status, ...(dto.status === 'JOINED' ? { hiredAt: new Date() } : {}) } }),
        this.prisma.applicationStatusHistory.createMany({
          data: rows.map((row) => ({ applicationId: row.id, fromStatus: row.status, toStatus: dto.status as ApplicationStatus, note: 'Bulk update' })),
        }),
      ]);
      for (const row of rows) {
        this.events.emit(EVENTS.APPLICATION_STATUS_CHANGED, {
          applicationId: row.id,
          from: row.status,
          to: dto.status as ApplicationStatus,
          note: 'Bulk update',
          notifyCandidate: true,
        });
      }
      return { affected: rows.length };
    }

    if (dto.action === 'delete') {
      const result = await this.prisma.jobApplication.updateMany({ where, data: { deletedAt: new Date() } });
      return { affected: result.count };
    }

    // export
    return this.exportCsv({ ids: dto.ids } as AdminApplicationListQuery);
  }

  async exportCsv(query: AdminApplicationListQuery & { ids?: string[] }): Promise<string> {
    const where: Prisma.JobApplicationWhereInput = query.ids
      ? { id: { in: query.ids }, deletedAt: null }
      : this.buildAdminWhere(query);

    const rows = await this.prisma.jobApplication.findMany({
      where,
      include: APPLICATION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return toCsv(rows, [
      ['Candidate', (row) => row.fullName],
      ['Email', (row) => row.email],
      ['Phone', (row) => row.phone],
      ['Job', (row) => row.job.title],
      ['Status', (row) => row.status],
      ['Rating', (row) => row.rating ?? ''],
      ['Experience (yrs)', (row) => row.experienceYears],
      ['Location', (row) => row.currentLocation],
      ['Source', (row) => row.source ?? ''],
      ['Applied at', (row) => row.createdAt],
    ]);
  }
}
