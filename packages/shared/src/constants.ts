/* ------------------------------------------------------------------ */
/* Enumerations — mirror the Prisma enums in apps/api/prisma/schema.prisma */
/* ------------------------------------------------------------------ */

export const APPLICATION_STATUSES = [
  'APPLIED',
  'UNDER_REVIEW',
  'TECHNICAL_ROUND',
  'HR_ROUND',
  'OFFER',
  'JOINED',
  'REJECTED',
  'WITHDRAWN',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** The happy-path hiring pipeline, in order (used for the candidate timeline). */
export const APPLICATION_PIPELINE: ApplicationStatus[] = [
  'APPLIED',
  'UNDER_REVIEW',
  'TECHNICAL_ROUND',
  'HR_ROUND',
  'OFFER',
  'JOINED',
];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: 'Applied',
  UNDER_REVIEW: 'Under Review',
  TECHNICAL_ROUND: 'Technical Round',
  HR_ROUND: 'HR Round',
  OFFER: 'Offer',
  JOINED: 'Joined',
  REJECTED: 'Not Selected',
  WITHDRAWN: 'Withdrawn',
};

export const JOB_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'CONTRACT_TO_HIRE', 'INTERNSHIP'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  CONTRACT_TO_HIRE: 'Contract-to-hire',
  INTERNSHIP: 'Internship',
};

export const WORK_MODES = ['REMOTE', 'HYBRID', 'ONSITE'] as const;
export type WorkMode = (typeof WORK_MODES)[number];
export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
  ONSITE: 'Onsite',
};

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const INTERVIEW_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const INTERVIEW_ROUNDS = ['SCREENING', 'TECHNICAL', 'MANAGERIAL', 'HR', 'CLIENT'] as const;
export type InterviewRound = (typeof INTERVIEW_ROUNDS)[number];

export const INTERVIEW_DECISIONS = ['STRONG_HIRE', 'HIRE', 'ON_HOLD', 'NO_HIRE', 'STRONG_NO_HIRE'] as const;
export type InterviewDecision = (typeof INTERVIEW_DECISIONS)[number];

export const NOTIFICATION_TYPES = [
  'APPLICATION_RECEIVED',
  'APPLICATION_STATUS_UPDATED',
  'INTERVIEW_SCHEDULED',
  'OFFER_RELEASED',
  'NEW_LEAD',
  'LEAD_ASSIGNED',
  'SYSTEM',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const EMAIL_TEMPLATE_KEYS = [
  'application.received.candidate',
  'application.received.admin',
  'application.status_updated',
  'interview.scheduled',
  'offer.released',
  'contact.received.admin',
  'contact.received.visitor',
  'lead.assigned',
  'auth.password_reset',
  'auth.welcome',
] as const;
export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

export const UPLOAD_PURPOSES = [
  'RESUME',
  'COVER_LETTER',
  'LOGO',
  'TEAM_PHOTO',
  'BLOG_IMAGE',
  'CASE_STUDY_IMAGE',
  'AVATAR',
  'GENERAL',
] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

/** Upload validation rules, enforced by the API (and pre-checked by the web client). */
export const UPLOAD_RULES: Record<UploadPurpose, { maxBytes: number; mimeTypes: string[]; private: boolean }> = {
  RESUME: {
    maxBytes: 5 * 1024 * 1024,
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    private: true,
  },
  COVER_LETTER: {
    maxBytes: 5 * 1024 * 1024,
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    private: true,
  },
  LOGO: { maxBytes: 2 * 1024 * 1024, mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'], private: false },
  TEAM_PHOTO: { maxBytes: 5 * 1024 * 1024, mimeTypes: ['image/png', 'image/jpeg', 'image/webp'], private: false },
  BLOG_IMAGE: { maxBytes: 5 * 1024 * 1024, mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'], private: false },
  CASE_STUDY_IMAGE: { maxBytes: 5 * 1024 * 1024, mimeTypes: ['image/png', 'image/jpeg', 'image/webp'], private: false },
  AVATAR: { maxBytes: 2 * 1024 * 1024, mimeTypes: ['image/png', 'image/jpeg', 'image/webp'], private: false },
  GENERAL: { maxBytes: 10 * 1024 * 1024, mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'], private: false },
};

/* ------------------------------------------------------------------ */
/* RBAC                                                                */
/* ------------------------------------------------------------------ */

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  HR: 'HR',
  RECRUITER: 'RECRUITER',
  HIRING_MANAGER: 'HIRING_MANAGER',
  CONTENT_EDITOR: 'CONTENT_EDITOR',
  SALES: 'SALES',
  CANDIDATE: 'CANDIDATE',
} as const;
export type RoleName = (typeof ROLES)[keyof typeof ROLES];

/** Roles allowed into /admin. */
export const STAFF_ROLES: RoleName[] = ['SUPER_ADMIN', 'HR', 'RECRUITER', 'HIRING_MANAGER', 'CONTENT_EDITOR', 'SALES'];

export const ROLE_LABELS: Record<RoleName, string> = {
  SUPER_ADMIN: 'Super Admin',
  HR: 'HR',
  RECRUITER: 'Recruiter',
  HIRING_MANAGER: 'Hiring Manager',
  CONTENT_EDITOR: 'Content Editor',
  SALES: 'Sales',
  CANDIDATE: 'Candidate',
};

/** Permission keys follow `<resource>:<action>`. */
export const PERMISSIONS = [
  'dashboard:read',
  'analytics:read',
  'users:read',
  'users:write',
  'roles:write',
  'jobs:read',
  'jobs:write',
  'applications:read',
  'applications:write',
  'interviews:read',
  'interviews:write',
  'interviews:feedback',
  'leads:read',
  'leads:write',
  'leads:assign',
  'content:read',
  'content:write',
  'settings:read',
  'settings:write',
  'audit:read',
  'uploads:write',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  SUPER_ADMIN: ALL,
  HR: [
    'dashboard:read', 'analytics:read', 'users:read',
    'jobs:read', 'jobs:write',
    'applications:read', 'applications:write',
    'interviews:read', 'interviews:write', 'interviews:feedback',
    'leads:read', 'settings:read', 'uploads:write',
  ],
  RECRUITER: [
    'dashboard:read', 'jobs:read', 'jobs:write',
    'applications:read', 'applications:write',
    'interviews:read', 'interviews:write', 'interviews:feedback', 'uploads:write',
  ],
  HIRING_MANAGER: [
    'dashboard:read', 'jobs:read', 'applications:read',
    'interviews:read', 'interviews:feedback',
  ],
  CONTENT_EDITOR: ['dashboard:read', 'content:read', 'content:write', 'uploads:write'],
  SALES: ['dashboard:read', 'leads:read', 'leads:write'],
  CANDIDATE: [],
};

export const API_PREFIX = '/api/v1';
export const REFRESH_COOKIE_NAME = 'kmg_rt';
/** Non-httpOnly hint cookie so the web middleware knows a session likely exists. */
export const SESSION_HINT_COOKIE_NAME = 'kmg_session';
