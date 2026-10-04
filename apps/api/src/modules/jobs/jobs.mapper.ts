import type { Job as PrismaJob, JobCategory as PrismaJobCategory, User } from '@prisma/client';
import type { Job, JobSummary, ProcessStep, ScreeningQuestion } from '@kmg/shared';

export type JobRow = PrismaJob & {
  department?: PrismaJobCategory | null;
  hiringManager?: Pick<User, 'id' | 'name'> | null;
  _count?: { applications?: number };
};

function toDepartment(department?: PrismaJobCategory | null) {
  if (!department) return null;
  return { id: department.id, name: department.name, slug: department.slug };
}

export function toJobSummary(job: JobRow): JobSummary {
  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    department: toDepartment(job.department),
    location: job.location,
    workMode: job.workMode,
    employmentType: job.employmentType,
    experienceMin: job.experienceMin,
    experienceMax: job.experienceMax ?? null,
    skills: job.skills,
    salaryMin: job.salaryMin ?? null,
    salaryMax: job.salaryMax ?? null,
    salaryCurrency: job.salaryCurrency ?? null,
    salaryPeriod: job.salaryPeriod ?? null,
    showSalary: job.showSalary,
    openings: job.openings,
    status: job.status,
    publishedAt: job.publishedAt?.toISOString() ?? null,
    closingDate: job.closingDate?.toISOString() ?? null,
    ...(job._count?.applications !== undefined ? { applicationCount: job._count.applications } : {}),
  };
}

export function toJob(job: JobRow): Job {
  return {
    ...toJobSummary(job),
    summary: job.summary,
    description: job.description,
    responsibilities: job.responsibilities,
    requirements: job.requirements,
    preferredSkills: job.preferredSkills,
    benefits: job.benefits,
    hiringProcess: (job.hiringProcess ?? []) as unknown as ProcessStep[],
    screeningQuestions: (job.screeningQuestions ?? []) as unknown as ScreeningQuestion[],
    hiringManager: job.hiringManager ? { id: job.hiringManager.id, name: job.hiringManager.name } : null,
    seoTitle: job.seoTitle ?? null,
    seoDescription: job.seoDescription ?? null,
  };
}
