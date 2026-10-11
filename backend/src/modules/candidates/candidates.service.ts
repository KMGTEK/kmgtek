import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Candidate, CandidateSkill, FileObject, Resume as PrismaResume, User } from '@prisma/client';
import { candidateProfileSchema, candidateSkillsSchema, type CandidateProfile, type JobSummary, type Resume } from '@kmg/shared';
import type { z } from 'zod';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { toJobSummary, type JobRow } from '../jobs/jobs.mapper';
import { computeProfileCompleteness } from './candidate-completeness.util';

// `CandidateProfileInput`/`CandidateSkillsInput` from `@kmg/shared` are `z.input` — the raw,
// pre-parse shape (e.g. `experienceYears: string | number | undefined`). By the time a request
// reaches this service, `ZodValidationPipe` has already run `schema.parse()`, so the value in
// hand is the *output* shape. Use `z.infer`/`z.output` here to match what's actually passed in.
export type CandidateProfileData = z.infer<typeof candidateProfileSchema>;
export type CandidateSkillsData = z.infer<typeof candidateSkillsSchema>;

type ResumeWithFile = PrismaResume & { file: FileObject };

type CandidateWithRelations = Candidate & {
  user: User;
  skills: CandidateSkill[];
  resumes: ResumeWithFile[];
};

@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  private async findByCandidateId(candidateId: string): Promise<CandidateWithRelations> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { user: true, skills: true, resumes: { include: { file: true }, orderBy: { createdAt: 'desc' } } },
    });
    if (!candidate) throw new NotFoundException('Candidate profile not found');
    return candidate as unknown as CandidateWithRelations;
  }

  private toProfile(candidate: CandidateWithRelations): CandidateProfile {
    return {
      id: candidate.id,
      userId: candidate.userId,
      name: candidate.user.name,
      email: candidate.user.email,
      phone: candidate.phone,
      location: candidate.location,
      headline: candidate.headline,
      summary: candidate.summary,
      currentCompany: candidate.currentCompany,
      experienceYears: candidate.experienceYears,
      currentCtc: candidate.currentCtc,
      expectedCtc: candidate.expectedCtc,
      noticePeriod: candidate.noticePeriod,
      linkedinUrl: candidate.linkedinUrl,
      githubUrl: candidate.githubUrl,
      portfolioUrl: candidate.portfolioUrl,
      avatarUrl: candidate.user.avatarUrl,
      skills: candidate.skills.map((skill) => ({ id: skill.id, name: skill.name, level: skill.level, years: skill.years })),
      resumes: candidate.resumes.map((resume) => this.toResumeDto(resume)),
      profileCompleteness: computeProfileCompleteness({
        phone: candidate.phone,
        location: candidate.location,
        headline: candidate.headline,
        summary: candidate.summary,
        currentCompany: candidate.currentCompany,
        experienceYears: candidate.experienceYears,
        linkedinUrl: candidate.linkedinUrl,
        githubUrl: candidate.githubUrl,
        portfolioUrl: candidate.portfolioUrl,
        skillsCount: candidate.skills.length,
        hasResume: candidate.resumes.length > 0,
      }),
    };
  }

  private toResumeDto(resume: ResumeWithFile): Resume {
    return {
      id: resume.id,
      file: this.uploads.toFileRef(resume.file),
      isPrimary: resume.isPrimary,
      createdAt: resume.createdAt.toISOString(),
    };
  }

  async getProfile(candidateId: string): Promise<CandidateProfile> {
    return this.toProfile(await this.findByCandidateId(candidateId));
  }

  async updateProfile(candidateId: string, userId: string, dto: CandidateProfileData): Promise<CandidateProfile> {
    await this.findByCandidateId(candidateId);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { name: dto.name } }),
      this.prisma.candidate.update({
        where: { id: candidateId },
        data: {
          phone: dto.phone ?? null,
          location: dto.location ?? null,
          headline: dto.headline ?? null,
          summary: dto.summary ?? null,
          currentCompany: dto.currentCompany ?? null,
          experienceYears: dto.experienceYears ?? null,
          currentCtc: dto.currentCtc ?? null,
          expectedCtc: dto.expectedCtc ?? null,
          noticePeriod: dto.noticePeriod ?? null,
          linkedinUrl: dto.linkedinUrl ?? null,
          githubUrl: dto.githubUrl ?? null,
          portfolioUrl: dto.portfolioUrl ?? null,
        },
      }),
    ]);
    return this.getProfile(candidateId);
  }

  async updateSkills(candidateId: string, dto: CandidateSkillsData): Promise<CandidateProfile['skills']> {
    await this.findByCandidateId(candidateId);
    await this.prisma.$transaction([
      this.prisma.candidateSkill.deleteMany({ where: { candidateId } }),
      this.prisma.candidateSkill.createMany({
        data: dto.skills.map((skill) => ({
          candidateId,
          name: skill.name,
          level: skill.level,
          years: skill.years,
        })),
      }),
    ]);
    const skills = await this.prisma.candidateSkill.findMany({ where: { candidateId } });
    return skills.map((skill) => ({ id: skill.id, name: skill.name, level: skill.level, years: skill.years }));
  }

  async setAvatar(userId: string, file: Express.Multer.File): Promise<{ avatarUrl: string }> {
    const stored = await this.uploads.store(file, 'AVATAR', userId);
    await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl: stored.url } });
    return { avatarUrl: stored.url };
  }

  /* ------------------------------- Resumes ------------------------------- */

  async listResumes(candidateId: string): Promise<Resume[]> {
    const resumes = await this.prisma.resume.findMany({
      where: { candidateId },
      include: { file: true },
      orderBy: { createdAt: 'desc' },
    });
    return resumes.map((resume) => this.toResumeDto(resume as never));
  }

  async addResume(candidateId: string, userId: string, file: Express.Multer.File): Promise<Resume> {
    const stored = await this.uploads.store(file, 'RESUME', userId);
    const isFirst = (await this.prisma.resume.count({ where: { candidateId } })) === 0;
    const resume = await this.prisma.resume.create({
      data: { candidateId, fileId: stored.id, isPrimary: isFirst },
      include: { file: true },
    });
    return this.toResumeDto(resume as never);
  }

  async setPrimaryResume(candidateId: string, resumeId: string): Promise<Resume> {
    const resume = await this.prisma.resume.findFirst({ where: { id: resumeId, candidateId } });
    if (!resume) throw new NotFoundException('Resume not found');

    await this.prisma.$transaction([
      this.prisma.resume.updateMany({ where: { candidateId }, data: { isPrimary: false } }),
      this.prisma.resume.update({ where: { id: resumeId }, data: { isPrimary: true } }),
    ]);
    const updated = await this.prisma.resume.findUnique({ where: { id: resumeId }, include: { file: true } });
    return this.toResumeDto(updated as never);
  }

  async removeResume(candidateId: string, resumeId: string): Promise<void> {
    const resume = await this.prisma.resume.findFirst({ where: { id: resumeId, candidateId } });
    if (!resume) throw new NotFoundException('Resume not found');
    // The underlying FileObject is kept: past applications may still reference it via a snapshot.
    await this.prisma.resume.delete({ where: { id: resumeId } });
    if (resume.isPrimary) {
      const next = await this.prisma.resume.findFirst({ where: { candidateId }, orderBy: { createdAt: 'desc' } });
      if (next) await this.prisma.resume.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
  }

  /* ----------------------------- Saved jobs ----------------------------- */

  async listSavedJobs(candidateId: string): Promise<JobSummary[]> {
    const saved = await this.prisma.savedJob.findMany({
      where: { candidateId },
      include: { job: { include: { department: true, hiringManager: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return saved.map((row) => toJobSummary(row.job as JobRow));
  }

  async saveJob(candidateId: string, jobId: string): Promise<void> {
    const job = await this.prisma.job.findFirst({ where: { id: jobId, deletedAt: null } });
    if (!job) throw new NotFoundException('Job not found');
    await this.prisma.savedJob.upsert({
      where: { candidateId_jobId: { candidateId, jobId } },
      create: { candidateId, jobId },
      update: {},
    });
  }

  async unsaveJob(candidateId: string, jobId: string): Promise<void> {
    await this.prisma.savedJob.deleteMany({ where: { candidateId, jobId } });
  }
}
