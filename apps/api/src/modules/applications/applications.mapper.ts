import type {
  ApplicationNote as PrismaNote,
  ApplicationStatusHistory,
  Candidate,
  FileObject,
  Job,
  JobApplication as PrismaJobApplication,
  JobCategory,
  User,
} from '@prisma/client';
import type { ApplicationNote, JobApplication, StatusHistoryEntry } from '@kmg/shared';
import { UploadsService } from '../uploads/uploads.service';
import { toInterview, type InterviewRow } from '../interviews/interviews.mapper';

export type ApplicationRow = PrismaJobApplication & {
  job: Job & { department: JobCategory | null };
  candidate: Candidate & { user: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'> };
  resume?: FileObject | null;
  coverLetter?: FileObject | null;
  history?: (ApplicationStatusHistory & { changedBy: Pick<User, 'id' | 'name'> | null })[];
  notes?: (PrismaNote & { author: Pick<User, 'id' | 'name'> })[];
  interviews?: InterviewRow[];
};

export function toStatusHistoryEntry(entry: NonNullable<ApplicationRow['history']>[number]): StatusHistoryEntry {
  return {
    id: entry.id,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    note: entry.note,
    changedBy: entry.changedBy ? { id: entry.changedBy.id, name: entry.changedBy.name } : null,
    createdAt: entry.createdAt.toISOString(),
  };
}

export function toApplicationNote(note: NonNullable<ApplicationRow['notes']>[number]): ApplicationNote {
  return {
    id: note.id,
    content: note.content,
    author: { id: note.author.id, name: note.author.name },
    createdAt: note.createdAt.toISOString(),
  };
}

export function toJobApplication(row: ApplicationRow, uploads: UploadsService): JobApplication {
  return {
    id: row.id,
    job: {
      id: row.job.id,
      slug: row.job.slug,
      title: row.job.title,
      location: row.job.location,
      workMode: row.job.workMode,
      employmentType: row.job.employmentType,
      department: row.job.department
        ? { id: row.job.department.id, name: row.job.department.name, slug: row.job.department.slug }
        : null,
    },
    candidate: {
      id: row.candidate.id,
      name: row.candidate.user.name,
      email: row.candidate.user.email,
      phone: row.phone,
      location: row.currentLocation,
      avatarUrl: row.candidate.user.avatarUrl,
    },
    status: row.status,
    rating: row.rating,
    source: row.source,
    currentCompany: row.currentCompany,
    experienceYears: row.experienceYears,
    currentCtc: row.currentCtc,
    expectedCtc: row.expectedCtc,
    noticePeriod: row.noticePeriod,
    linkedinUrl: row.linkedinUrl,
    githubUrl: row.githubUrl,
    portfolioUrl: row.portfolioUrl,
    resume: row.resume ? uploads.toFileRef(row.resume) : null,
    coverLetter: row.coverLetter ? uploads.toFileRef(row.coverLetter) : null,
    answers: (row.answers ?? []) as unknown as JobApplication['answers'],
    history: (row.history ?? []).map(toStatusHistoryEntry),
    ...(row.notes ? { notes: row.notes.map(toApplicationNote) } : {}),
    ...(row.interviews ? { interviews: row.interviews.map((interview) => toInterview(interview)) } : {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const APPLICATION_INCLUDE = {
  job: { include: { department: true } },
  candidate: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
  resume: true,
  coverLetter: true,
} as const;
