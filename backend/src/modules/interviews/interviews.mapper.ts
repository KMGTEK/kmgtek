import type {
  Interview as PrismaInterview,
  InterviewFeedback as PrismaFeedback,
  InterviewInterviewer,
  JobApplication,
  Job,
  Candidate,
  User,
} from '@prisma/client';
import type { Interview, InterviewFeedback } from '@kmg/shared';

export type InterviewRow = PrismaInterview & {
  interviewers: (InterviewInterviewer & { user: Pick<User, 'id' | 'name' | 'email'> })[];
  feedback: (PrismaFeedback & { interviewer: Pick<User, 'id' | 'name'> })[];
  application?: JobApplication & {
    job: Pick<Job, 'id' | 'title' | 'slug'>;
    candidate: Candidate & { user: Pick<User, 'id' | 'name' | 'email'> };
  };
};

export function toInterviewFeedback(feedback: InterviewRow['feedback'][number]): InterviewFeedback {
  return {
    id: feedback.id,
    interviewer: { id: feedback.interviewer.id, name: feedback.interviewer.name },
    rating: feedback.rating,
    decision: feedback.decision,
    strengths: feedback.strengths,
    weaknesses: feedback.weaknesses,
    comments: feedback.comments,
    createdAt: feedback.createdAt.toISOString(),
  };
}

export function toInterview(interview: InterviewRow): Interview {
  return {
    id: interview.id,
    applicationId: interview.applicationId,
    title: interview.title,
    round: interview.round,
    status: interview.status,
    scheduledAt: interview.scheduledAt.toISOString(),
    durationMinutes: interview.durationMinutes,
    timezone: interview.timezone,
    meetingUrl: interview.meetingUrl,
    location: interview.location,
    notes: interview.notes,
    interviewers: interview.interviewers.map((i) => ({ id: i.user.id, name: i.user.name, email: i.user.email })),
    feedback: interview.feedback.map(toInterviewFeedback),
    ...(interview.application
      ? {
          candidate: {
            id: interview.application.candidate.id,
            name: interview.application.candidate.user.name,
            email: interview.application.candidate.user.email,
          },
          job: { id: interview.application.job.id, title: interview.application.job.title, slug: interview.application.job.slug },
        }
      : {}),
    createdAt: interview.createdAt.toISOString(),
  };
}

export const INTERVIEW_INCLUDE = {
  interviewers: { include: { user: { select: { id: true, name: true, email: true } } } },
  feedback: { include: { interviewer: { select: { id: true, name: true } } } },
} as const;

export const INTERVIEW_INCLUDE_WITH_APPLICATION = {
  ...INTERVIEW_INCLUDE,
  application: {
    include: {
      job: { select: { id: true, title: true, slug: true } },
      candidate: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  },
} as const;
