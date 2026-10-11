import { z } from 'zod';
import {
  APPLICATION_STATUSES,
  EMPLOYMENT_TYPES,
  INTERVIEW_DECISIONS,
  INTERVIEW_ROUNDS,
  INTERVIEW_STATUSES,
  JOB_STATUSES,
  LEAD_STATUSES,
  ROLES,
  WORK_MODES,
} from '../constants';
import { coercedDate, coercedNumber, optionalCoercedDate, optionalCoercedNumber, optionalString, optionalUrl, slugSchema } from './common';

const faq = z.object({ question: z.string().min(1).max(300), answer: z.string().min(1).max(3000) });
const step = z.object({ title: z.string().min(1).max(160), description: z.string().max(1000).default('') });
const benefit = z.object({ title: z.string().min(1).max(160), description: z.string().max(1000).default(''), icon: optionalString(60) });
const optionalDate = optionalCoercedDate();
const optionalNumber = optionalCoercedNumber(z.number().min(0));

export const jobUpsertSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: slugSchema.optional(),
  departmentId: optionalString(64),
  summary: z.string().trim().min(10).max(500),
  description: z.string().min(20).max(50000),
  skills: z.array(z.string().trim().min(1).max(60)).max(40).default([]),
  responsibilities: z.array(z.string().trim().min(1).max(500)).default([]),
  requirements: z.array(z.string().trim().min(1).max(500)).default([]),
  preferredSkills: z.array(z.string().trim().min(1).max(500)).default([]),
  benefits: z.array(z.string().trim().min(1).max(500)).default([]),
  hiringProcess: z.array(step).default([]),
  screeningQuestions: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        question: z.string().min(3).max(300),
        type: z.enum(['text', 'textarea', 'yesno', 'number']),
        required: z.boolean().default(false),
      }),
    )
    .max(20)
    .default([]),
  experienceMin: coercedNumber(z.number().min(0).max(60)).default(0),
  experienceMax: optionalNumber,
  employmentType: z.enum(EMPLOYMENT_TYPES),
  workMode: z.enum(WORK_MODES),
  location: z.string().trim().min(2).max(120),
  salaryMin: optionalNumber,
  salaryMax: optionalNumber,
  salaryCurrency: optionalString(3),
  salaryPeriod: z.enum(['YEAR', 'MONTH', 'HOUR']).optional(),
  showSalary: z.boolean().default(false),
  openings: coercedNumber(z.number().int().min(1).max(500)).default(1),
  hiringManagerId: optionalString(64),
  status: z.enum(JOB_STATUSES).default('DRAFT'),
  publishedAt: optionalDate,
  closingDate: optionalDate,
  seoTitle: optionalString(70),
  seoDescription: optionalString(170),
});
export type JobUpsertInput = z.input<typeof jobUpsertSchema>;

export const applicationStatusUpdateSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
  note: optionalString(2000),
  notifyCandidate: z.boolean().default(true),
});
export type ApplicationStatusUpdateInput = z.input<typeof applicationStatusUpdateSchema>;

export const applicationBulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  action: z.enum(['status', 'delete', 'export']),
  status: z.enum(APPLICATION_STATUSES).optional(),
});
export type ApplicationBulkInput = z.infer<typeof applicationBulkSchema>;

export const noteSchema = z.object({ content: z.string().trim().min(1).max(5000) });
export const ratingSchema = z.object({ rating: coercedNumber(z.number().int().min(1).max(5)) });

export const interviewUpsertSchema = z.object({
  applicationId: z.string().min(1),
  title: z.string().trim().min(3).max(160),
  round: z.enum(INTERVIEW_ROUNDS),
  status: z.enum(INTERVIEW_STATUSES).default('SCHEDULED'),
  scheduledAt: coercedDate(),
  durationMinutes: coercedNumber(z.number().int().min(15).max(480)).default(60),
  timezone: z.string().min(1).max(60).default('America/New_York'),
  interviewerIds: z.array(z.string().min(1)).min(1, 'Assign at least one interviewer'),
  meetingUrl: optionalUrl,
  generateMeetingLink: z.boolean().default(true),
  location: optionalString(200),
  notes: optionalString(5000),
  notifyCandidate: z.boolean().default(true),
});
export type InterviewUpsertInput = z.input<typeof interviewUpsertSchema>;

export const interviewFeedbackSchema = z.object({
  rating: coercedNumber(z.number().int().min(1).max(5)),
  decision: z.enum(INTERVIEW_DECISIONS),
  strengths: optionalString(3000),
  weaknesses: optionalString(3000),
  comments: z.string().trim().min(5).max(5000),
});
export type InterviewFeedbackInput = z.input<typeof interviewFeedbackSchema>;

export const leadUpdateSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  assignedToId: z.string().min(1).nullable().optional(),
});
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;

export const categoryUpsertSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema.optional(),
  description: optionalString(500),
});
export type CategoryUpsertInput = z.input<typeof categoryUpsertSchema>;

export const testimonialUpsertSchema = z.object({
  authorName: z.string().trim().min(2).max(120),
  authorTitle: optionalString(120),
  company: optionalString(120),
  avatarUrl: optionalString(500),
  quote: z.string().trim().min(10).max(2000),
  rating: coercedNumber(z.number().int().min(1).max(5)).default(5),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  order: coercedNumber(z.number().int()).default(0),
});
export type TestimonialUpsertInput = z.input<typeof testimonialUpsertSchema>;

export const teamMemberUpsertSchema = z.object({
  name: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(120),
  bio: optionalString(3000),
  photoUrl: optionalString(500),
  linkedinUrl: optionalUrl,
  twitterUrl: optionalUrl,
  isLeadership: z.boolean().default(false),
  published: z.boolean().default(true),
  order: coercedNumber(z.number().int()).default(0),
});
export type TeamMemberUpsertInput = z.input<typeof teamMemberUpsertSchema>;

export const caseStudyUpsertSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: slugSchema.optional(),
  clientName: optionalString(160),
  industry: z.string().trim().min(2).max(120),
  summary: z.string().trim().min(10).max(600),
  challenge: z.string().min(10),
  solution: z.string().min(10),
  architecture: optionalString(100000),
  results: z.string().min(10),
  metrics: z.array(z.object({ label: z.string().min(1).max(80), value: z.string().min(1).max(40) })).max(12).default([]),
  coverImageUrl: optionalString(500),
  images: z.array(z.object({ url: z.string().min(1).max(500), caption: optionalString(200) })).max(30).default([]),
  technologyIds: z.array(z.string().min(1)).default([]),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  seoTitle: optionalString(70),
  seoDescription: optionalString(170),
});
export type CaseStudyUpsertInput = z.input<typeof caseStudyUpsertSchema>;

export const serviceUpsertSchema = z.object({
  title: z.string().trim().min(3).max(120),
  slug: slugSchema.optional(),
  shortDescription: z.string().trim().min(10).max(300),
  overview: z.string().min(10).max(20000),
  icon: z.string().min(1).max(60).default('Cloud'),
  benefits: z.array(benefit).default([]),
  process: z.array(step).default([]),
  faqs: z.array(faq).default([]),
  technologyIds: z.array(z.string().min(1)).default([]),
  order: coercedNumber(z.number().int()).default(0),
  published: z.boolean().default(true),
  seoTitle: optionalString(70),
  seoDescription: optionalString(170),
});
export type ServiceUpsertInput = z.input<typeof serviceUpsertSchema>;

export const technologyUpsertSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: slugSchema.optional(),
  categoryId: z.string().min(1),
  description: optionalString(1000),
  logoUrl: optionalString(500),
  websiteUrl: optionalUrl,
  order: coercedNumber(z.number().int()).default(0),
});
export type TechnologyUpsertInput = z.input<typeof technologyUpsertSchema>;

export const staffUserUpsertSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().trim().toLowerCase(),
  roles: z.array(z.enum(Object.values(ROLES) as [string, ...string[]])).min(1),
  password: z
    .union([z.literal(''), z.string().min(8).max(128)])
    .optional()
    .transform((v): string | undefined => (v === '' || v === undefined ? undefined : v)),
  status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED']).default('ACTIVE'),
});
export type StaffUserUpsertInput = z.input<typeof staffUserUpsertSchema>;

export const emailTemplateUpdateSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  html: z.string().min(10).max(100000),
});
export type EmailTemplateUpdateInput = z.infer<typeof emailTemplateUpdateSchema>;

export const settingsGroupSchema = z.enum(['company', 'branding', 'social', 'seo', 'analytics', 'footer', 'legal', 'features', 'email']);
export type SettingsGroup = z.infer<typeof settingsGroupSchema>;
