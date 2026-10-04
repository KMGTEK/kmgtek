import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  ROLES,
  jobUpsertSchema,
  type Job,
  type JobFacets,
  type JobSummary,
  type JobsQuery,
  type Paginated,
  type ScreeningQuestion,
} from '@kmg/shared';
import type { z } from 'zod';
import type { Request } from 'express';
import { AppConfigService } from '../../config/config.module';
import type { RequestUser } from '../../common/types';
import { sha256 } from '../../common/utils/crypto.util';
import { randomToken } from '../../common/utils/crypto.util';
import { MailService } from '../../infrastructure/mail/mail.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { paginate, parsePagination } from '../../common/utils/pagination.util';
import { slugify, uniqueSlug } from '../../common/utils/slug.util';
import { RESET_TOKEN_TTL_MINUTES } from '../auth/auth.service';
import { AppEventsService } from '../events/app-events.service';
import { EVENTS } from '../events/event-names';
import { UploadsService } from '../uploads/uploads.service';
import { toJob, toJobSummary, type JobRow } from './jobs.mapper';

export type JobUpsertData = z.output<typeof jobUpsertSchema>;

export interface JobApplicationFiles {
  resume?: Express.Multer.File[];
  coverLetter?: Express.Multer.File[];
}

export interface JobApplicationData {
  name: string;
  email: string;
  phone: string;
  currentLocation: string;
  currentCompany?: string;
  experienceYears: number;
  currentCtc?: string;
  expectedCtc?: string;
  noticePeriod?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  resumeId?: string;
  answers?: string;
  source?: string;
}

export interface AdminJobListQuery {
  [key: string]: unknown;
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  status?: string;
  departmentId?: string;
  workMode?: string;
  employmentType?: string;
}

const JOB_INCLUDE = {
  department: true,
  hiringManager: { select: { id: true, name: true } },
} as const;

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: string }).code === 'P2002');
}
function isForeignKeyError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: string }).code === 'P2003');
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly mail: MailService,
    private readonly config: AppConfigService,
    private readonly events: AppEventsService,
  ) {}

  /* ------------------------------- Public ------------------------------- */

  private publicJobWhere(): Prisma.JobWhereInput {
    return {
      deletedAt: null,
      status: 'PUBLISHED',
      OR: [{ closingDate: null }, { closingDate: { gte: new Date() } }],
    };
  }

  async listPublic(query: JobsQuery): Promise<Paginated<JobSummary>> {
    const { page, pageSize, skip, take } = parsePagination(query, 10);
    const and: Prisma.JobWhereInput[] = [this.publicJobWhere()];

    if (query.search) {
      and.push({
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { summary: { contains: query.search, mode: 'insensitive' } },
          { skills: { has: query.search } },
        ],
      });
    }
    if (query.location) and.push({ location: { contains: query.location, mode: 'insensitive' } });
    if (query.department) {
      and.push({ department: { OR: [{ slug: query.department }, { name: { equals: query.department, mode: 'insensitive' } }] } });
    }
    if (query.technology) and.push({ skills: { has: query.technology } });
    if (query.employmentType) {
      and.push({ employmentType: { in: query.employmentType.split(',') as JobSummary['employmentType'][] } });
    }
    if (query.workMode) {
      and.push({ workMode: { in: query.workMode.split(',') as JobSummary['workMode'][] } });
    }
    if (query.experienceMin !== undefined) {
      and.push({ OR: [{ experienceMax: null }, { experienceMax: { gte: query.experienceMin } }] });
    }
    if (query.experienceMax !== undefined) {
      and.push({ experienceMin: { lte: query.experienceMax } });
    }

    const where: Prisma.JobWhereInput = { AND: and };
    const orderBy: Prisma.JobOrderByWithRelationInput =
      query.sort === 'oldest' ? { publishedAt: 'asc' } : query.sort === 'title' ? { title: 'asc' } : { publishedAt: 'desc' };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({ where, skip, take, orderBy, include: JOB_INCLUDE }),
      this.prisma.job.count({ where }),
    ]);
    return paginate(rows.map((row) => toJobSummary(row as JobRow)), total, { page, pageSize });
  }

  async facets(): Promise<JobFacets> {
    const jobs = await this.prisma.job.findMany({
      where: this.publicJobWhere(),
      select: { location: true, employmentType: true, workMode: true, skills: true, department: true },
    });

    const locations = new Set<string>();
    const employmentTypes = new Set<JobSummary['employmentType']>();
    const workModes = new Set<JobSummary['workMode']>();
    const technologies = new Set<string>();
    const departments = new Map<string, { id: string; name: string; slug: string; jobCount: number }>();

    for (const job of jobs) {
      locations.add(job.location);
      employmentTypes.add(job.employmentType);
      workModes.add(job.workMode);
      for (const skill of job.skills) technologies.add(skill);
      if (job.department) {
        const existing = departments.get(job.department.id);
        if (existing) existing.jobCount += 1;
        else departments.set(job.department.id, { id: job.department.id, name: job.department.name, slug: job.department.slug, jobCount: 1 });
      }
    }

    return {
      locations: [...locations].sort(),
      technologies: [...technologies].sort(),
      departments: [...departments.values()].sort((a, b) => a.name.localeCompare(b.name)),
      employmentTypes: [...employmentTypes],
      workModes: [...workModes],
    };
  }

  async getBySlugPublic(slug: string): Promise<Job & { similar: JobSummary[] }> {
    const job = await this.prisma.job.findFirst({
      where: { slug, deletedAt: null, status: 'PUBLISHED' },
      include: JOB_INCLUDE,
    });
    if (!job) throw new NotFoundException('Job not found');

    await this.prisma.job.update({ where: { id: job.id }, data: { views: { increment: 1 } } }).catch(() => undefined);

    const similarRows = await this.prisma.job.findMany({
      where: {
        ...this.publicJobWhere(),
        id: { not: job.id },
        OR: [
          ...(job.departmentId ? [{ departmentId: job.departmentId }] : []),
          ...(job.skills.length ? [{ skills: { hasSome: job.skills } }] : []),
        ],
      },
      include: JOB_INCLUDE,
      orderBy: { publishedAt: 'desc' },
      take: 4,
    });

    return { ...toJob(job as JobRow), similar: similarRows.map((row) => toJobSummary(row as JobRow)) };
  }

  /** Job + files → job application. Returns the created application id. */
  async apply(
    slug: string,
    dto: JobApplicationData,
    files: JobApplicationFiles,
    currentUser: RequestUser | undefined,
    request: Request,
  ): Promise<{ applicationId: string; candidateAccountCreated: boolean }> {
    const job = await this.prisma.job.findFirst({ where: { slug, deletedAt: null } });
    if (!job || job.status !== 'PUBLISHED') {
      throw new NotFoundException('Job not found or not accepting applications');
    }

    const email = dto.email.toLowerCase();
    let candidateId: string;
    let candidateAccountCreated = false;
    let newUserId: string | undefined;

    if (currentUser?.candidateId) {
      candidateId = currentUser.candidateId;
    } else {
      const existingCandidate = await this.prisma.candidate.findFirst({ where: { user: { email } } });
      if (existingCandidate) {
        candidateId = existingCandidate.id;
      } else {
        const candidateRole = await this.prisma.role.findUnique({ where: { name: ROLES.CANDIDATE } });
        if (!candidateRole) throw new Error('CANDIDATE role is missing — run the database seed');

        const user = await this.prisma.user.create({
          data: {
            email,
            name: dto.name,
            status: 'INVITED',
            roles: { create: { roleId: candidateRole.id } },
            candidate: { create: {} },
          },
          include: { candidate: true },
        });
        candidateId = user.candidate!.id;
        candidateAccountCreated = true;
        newUserId = user.id;
      }
    }

    const existingApplication = await this.prisma.jobApplication.findUnique({
      where: { jobId_candidateId: { jobId: job.id, candidateId } },
    });
    if (existingApplication) throw new ConflictException('You have already applied to this job');

    let resumeFileId: string | undefined;
    if (dto.resumeId) {
      if (!currentUser?.candidateId) {
        throw new BadRequestException('resumeId can only be used when signed in as a candidate');
      }
      const resume = await this.prisma.resume.findFirst({ where: { id: dto.resumeId, candidateId } });
      if (!resume) throw new BadRequestException('Resume not found');
      resumeFileId = resume.fileId;
    } else {
      const resumeFile = files.resume?.[0];
      if (!resumeFile) throw new BadRequestException('Resume is required');
      const stored = await this.uploads.store(resumeFile, 'RESUME', currentUser?.id ?? newUserId ?? null);
      resumeFileId = stored.id;
    }

    let coverFileId: string | undefined;
    const coverFile = files.coverLetter?.[0];
    if (coverFile) {
      const stored = await this.uploads.store(coverFile, 'COVER_LETTER', currentUser?.id ?? newUserId ?? null);
      coverFileId = stored.id;
    }

    const answers = this.parseAnswers(dto.answers, (job.screeningQuestions as unknown as ScreeningQuestion[]) ?? []);

    let applicationId: string;
    try {
      const application = await this.prisma.jobApplication.create({
        data: {
          jobId: job.id,
          candidateId,
          fullName: dto.name,
          email,
          phone: dto.phone,
          currentLocation: dto.currentLocation,
          currentCompany: dto.currentCompany ?? null,
          experienceYears: dto.experienceYears,
          currentCtc: dto.currentCtc ?? null,
          expectedCtc: dto.expectedCtc ?? null,
          noticePeriod: dto.noticePeriod ?? null,
          linkedinUrl: dto.linkedinUrl ?? null,
          githubUrl: dto.githubUrl ?? null,
          portfolioUrl: dto.portfolioUrl ?? null,
          answers: answers as unknown as Prisma.InputJsonValue,
          consentAt: new Date(),
          resumeFileId: resumeFileId ?? null,
          coverFileId: coverFileId ?? null,
          source: dto.source ?? 'careers-page',
          ip: request.ip ?? null,
        },
      });
      applicationId = application.id;
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new ConflictException('You have already applied to this job');
      throw error;
    }

    if (candidateAccountCreated && newUserId) {
      await this.sendSetPasswordWelcome(newUserId, email, dto.name);
    }

    this.events.emit(EVENTS.APPLICATION_CREATED, { applicationId });
    return { applicationId, candidateAccountCreated };
  }

  private parseAnswers(
    raw: string | undefined,
    bank: ScreeningQuestion[],
  ): Array<{ questionId: string; question: string; answer: string }> {
    if (!raw) return [];
    let parsed: Array<{ questionId: string; answer: unknown }>;
    try {
      parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('not an array');
    } catch {
      throw new BadRequestException('answers must be a JSON array of { questionId, answer }');
    }
    return parsed.map((entry) => ({
      questionId: entry.questionId,
      question: bank.find((q) => q.id === entry.questionId)?.question ?? '',
      answer: String(entry.answer ?? ''),
    }));
  }

  /** New candidate account created during a guest apply → welcome email carrying a set-password link. */
  private async sendSetPasswordWelcome(userId: string, email: string, name: string): Promise<void> {
    const token = randomToken(32);
    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000),
      },
    });
    const portalUrl = `${this.config.webUrl}/reset-password?token=${encodeURIComponent(token)}&next=%2Fportal`;
    this.mail.queueTemplate({
      to: email,
      templateKey: 'auth.welcome',
      variables: { name, portalUrl, jobsUrl: `${this.config.webUrl}/careers` },
    });
  }

  /* -------------------------------- Admin -------------------------------- */

  async listAdmin(query: AdminJobListQuery): Promise<Paginated<JobSummary>> {
    const { page, pageSize, skip, take } = parsePagination(query);
    const where: Prisma.JobWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status as JobSummary['status'] } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.workMode ? { workMode: query.workMode as JobSummary['workMode'] } : {}),
      ...(query.employmentType ? { employmentType: query.employmentType as JobSummary['employmentType'] } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const orderBy = this.parseAdminSort(query.sort);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { ...JOB_INCLUDE, _count: { select: { applications: true } } },
      }),
      this.prisma.job.count({ where }),
    ]);
    return paginate(rows.map((row) => toJobSummary(row as JobRow)), total, { page, pageSize });
  }

  private parseAdminSort(sort?: string): Prisma.JobOrderByWithRelationInput {
    const allowed = ['createdAt', 'title', 'publishedAt', 'views'] as const;
    if (!sort) return { createdAt: 'desc' };
    const [field, direction] = sort.split(':');
    if (!allowed.includes(field as (typeof allowed)[number])) return { createdAt: 'desc' };
    return { [field]: direction?.toLowerCase() === 'asc' ? 'asc' : 'desc' };
  }

  async getAdmin(id: string): Promise<Job> {
    const job = await this.prisma.job.findFirst({
      where: { id, deletedAt: null },
      include: { ...JOB_INCLUDE, _count: { select: { applications: true } } },
    });
    if (!job) throw new NotFoundException('Job not found');
    return toJob(job as JobRow);
  }

  private async resolveSlug(source: string, explicit: boolean, excludeId?: string): Promise<string> {
    const exists = (candidate: string) =>
      this.prisma.job.count({ where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) } }).then((c) => c > 0);

    if (explicit) {
      const slug = slugify(source);
      if (await exists(slug)) throw new BadRequestException('This slug is already in use');
      return slug;
    }
    return uniqueSlug(source, exists);
  }

  private mapUpsertData(dto: JobUpsertData): Prisma.JobUncheckedCreateInput {
    return {
      title: dto.title,
      slug: '', // overwritten by caller
      summary: dto.summary,
      description: dto.description,
      skills: dto.skills,
      responsibilities: dto.responsibilities,
      requirements: dto.requirements,
      preferredSkills: dto.preferredSkills,
      benefits: dto.benefits,
      hiringProcess: dto.hiringProcess as unknown as Prisma.InputJsonValue,
      screeningQuestions: dto.screeningQuestions as unknown as Prisma.InputJsonValue,
      experienceMin: dto.experienceMin,
      experienceMax: dto.experienceMax ?? null,
      employmentType: dto.employmentType,
      workMode: dto.workMode,
      location: dto.location,
      salaryMin: dto.salaryMin ?? null,
      salaryMax: dto.salaryMax ?? null,
      salaryCurrency: dto.salaryCurrency ?? 'USD',
      salaryPeriod: dto.salaryPeriod ?? 'YEAR',
      showSalary: dto.showSalary,
      openings: dto.openings,
      status: dto.status,
      publishedAt: dto.status === 'PUBLISHED' ? dto.publishedAt ?? new Date() : dto.publishedAt ?? null,
      closingDate: dto.closingDate ?? null,
      seoTitle: dto.seoTitle ?? null,
      seoDescription: dto.seoDescription ?? null,
      departmentId: dto.departmentId ?? null,
      hiringManagerId: dto.hiringManagerId ?? null,
    };
  }

  async create(dto: JobUpsertData, userId: string): Promise<Job> {
    const slug = await this.resolveSlug(dto.slug ?? dto.title, Boolean(dto.slug));
    try {
      const job = await this.prisma.job.create({
        data: { ...this.mapUpsertData(dto), slug, createdById: userId },
        include: JOB_INCLUDE,
      });
      return toJob(job as JobRow);
    } catch (error) {
      if (isForeignKeyError(error)) throw new BadRequestException('Unknown department or hiring manager');
      throw error;
    }
  }

  async update(id: string, dto: JobUpsertData): Promise<Job> {
    const existing = await this.prisma.job.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Job not found');

    const slug = dto.slug && dto.slug !== existing.slug ? await this.resolveSlug(dto.slug, true, id) : existing.slug;
    try {
      const job = await this.prisma.job.update({
        where: { id },
        data: { ...this.mapUpsertData(dto), slug },
        include: JOB_INCLUDE,
      });
      return toJob(job as JobRow);
    } catch (error) {
      if (isForeignKeyError(error)) throw new BadRequestException('Unknown department or hiring manager');
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.job.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Job not found');
    await this.prisma.softDelete('job', id);
  }

  async duplicate(id: string, userId: string): Promise<Job> {
    const existing = await this.prisma.job.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Job not found');

    const slug = await uniqueSlug(
      `${existing.title}-copy`,
      (candidate) => this.prisma.job.count({ where: { slug: candidate } }).then((c) => c > 0),
    );

    const job = await this.prisma.job.create({
      data: {
        title: `${existing.title} (Copy)`,
        slug,
        summary: existing.summary,
        description: existing.description,
        skills: existing.skills,
        responsibilities: existing.responsibilities,
        requirements: existing.requirements,
        preferredSkills: existing.preferredSkills,
        benefits: existing.benefits,
        hiringProcess: existing.hiringProcess as Prisma.InputJsonValue,
        screeningQuestions: existing.screeningQuestions as Prisma.InputJsonValue,
        experienceMin: existing.experienceMin,
        experienceMax: existing.experienceMax,
        employmentType: existing.employmentType,
        workMode: existing.workMode,
        location: existing.location,
        salaryMin: existing.salaryMin,
        salaryMax: existing.salaryMax,
        salaryCurrency: existing.salaryCurrency,
        salaryPeriod: existing.salaryPeriod,
        showSalary: existing.showSalary,
        openings: existing.openings,
        status: 'DRAFT',
        publishedAt: null,
        closingDate: existing.closingDate,
        seoTitle: existing.seoTitle,
        seoDescription: existing.seoDescription,
        departmentId: existing.departmentId,
        hiringManagerId: existing.hiringManagerId,
        createdById: userId,
        views: 0,
      },
      include: JOB_INCLUDE,
    });
    return toJob(job as JobRow);
  }
}
