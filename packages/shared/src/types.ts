import type {
  ApplicationStatus,
  EmploymentType,
  InterviewDecision,
  InterviewRound,
  InterviewStatus,
  JobStatus,
  LeadStatus,
  NotificationType,
  Permission,
  RoleName,
  WorkMode,
} from './constants';

/* ---------------------------- API envelopes ---------------------------- */

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Every successful single-resource response: `{ data }`. */
export interface ApiResponse<T> {
  data: T;
}

/** Every successful list response: `{ data, meta }`. */
export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Every error response (produced by the API's global exception filter). */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: Array<{ path: string; message: string }>;
  path: string;
  timestamp: string;
  requestId?: string;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string; // e.g. "createdAt:desc"
}

/* ------------------------------ Entities ------------------------------ */

export interface FileRef {
  id: string;
  url: string; // public URL, or API proxy URL for private files
  originalName: string;
  mimeType: string;
  size: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  roles: RoleName[];
  permissions: Permission[];
  emailVerified: boolean;
  candidateId?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number; // seconds
  user: AuthUser;
}

export interface FAQ {
  question: string;
  answer: string;
}
export interface ProcessStep {
  title: string;
  description: string;
}
export interface Benefit {
  title: string;
  description: string;
  icon?: string;
}

export interface Service {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  overview: string;
  icon: string; // lucide icon name
  benefits: Benefit[];
  process: ProcessStep[];
  faqs: FAQ[];
  technologies: Pick<Technology, 'id' | 'name' | 'slug' | 'logoUrl'>[];
  order: number;
  /** Only present on admin responses (public list/detail endpoints only return published rows). */
  published?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface TechnologyCategory {
  id: string;
  name: string;
  slug: string;
  order: number;
  technologies: Technology[];
}

export interface Technology {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  categoryId: string;
  categoryName?: string;
  order?: number;
}

export interface TeamMember {
  id: string;
  name: string;
  title: string;
  bio?: string | null;
  photoUrl?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  isLeadership: boolean;
  order: number;
  /** Only present on admin responses (public list only returns published rows). */
  published?: boolean;
}

export interface Testimonial {
  id: string;
  authorName: string;
  authorTitle?: string | null;
  company?: string | null;
  avatarUrl?: string | null;
  quote: string;
  rating: number;
  featured: boolean;
  order?: number;
  /** Only present on admin responses (public list only returns published rows). */
  published?: boolean;
}

export interface Metric {
  label: string;
  value: string;
}

export interface CaseStudy {
  id: string;
  slug: string;
  title: string;
  clientName?: string | null;
  industry: string;
  summary: string;
  challenge: string; // rich HTML
  solution: string; // rich HTML
  architecture?: string | null; // rich HTML
  results: string; // rich HTML
  metrics: Metric[];
  coverImageUrl?: string | null;
  images: { id: string; url: string; caption?: string | null }[];
  technologies: Pick<Technology, 'id' | 'name' | 'slug' | 'logoUrl'>[];
  featured: boolean;
  publishedAt?: string | null;
  /** Only present on admin responses (public list only returns published rows). */
  published?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface JobCategory {
  id: string;
  name: string;
  slug: string;
  jobCount?: number;
}

export interface JobSummary {
  id: string;
  slug: string;
  title: string;
  department: JobCategory | null;
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  experienceMin: number;
  experienceMax?: number | null;
  skills: string[];
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: 'YEAR' | 'MONTH' | 'HOUR' | null;
  showSalary: boolean;
  openings: number;
  status: JobStatus;
  publishedAt?: string | null;
  closingDate?: string | null;
  applicationCount?: number;
}

export interface Job extends JobSummary {
  summary: string;
  description: string; // HTML
  responsibilities: string[];
  requirements: string[];
  preferredSkills: string[];
  benefits: string[];
  hiringProcess: ProcessStep[];
  screeningQuestions: ScreeningQuestion[];
  hiringManager?: { id: string; name: string } | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface ScreeningQuestion {
  id: string;
  question: string;
  type: 'text' | 'textarea' | 'yesno' | 'number';
  required: boolean;
}

export interface JobFacets {
  locations: string[];
  technologies: string[];
  departments: JobCategory[];
  employmentTypes: EmploymentType[];
  workModes: WorkMode[];
}

export interface CandidateProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  headline?: string | null;
  summary?: string | null;
  currentCompany?: string | null;
  experienceYears?: number | null;
  currentCtc?: string | null;
  expectedCtc?: string | null;
  noticePeriod?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  avatarUrl?: string | null;
  skills: { id: string; name: string; level?: string | null; years?: number | null }[];
  resumes: Resume[];
  profileCompleteness: number; // 0-100
}

export interface Resume {
  id: string;
  file: FileRef;
  isPrimary: boolean;
  createdAt: string;
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus?: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  note?: string | null;
  changedBy?: { id: string; name: string } | null;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  job: Pick<JobSummary, 'id' | 'slug' | 'title' | 'location' | 'workMode' | 'employmentType'> & {
    department?: JobCategory | null;
  };
  candidate: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    location?: string | null;
    avatarUrl?: string | null;
  };
  status: ApplicationStatus;
  rating?: number | null;
  source?: string | null;
  currentCompany?: string | null;
  experienceYears?: number | null;
  currentCtc?: string | null;
  expectedCtc?: string | null;
  noticePeriod?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  resume?: FileRef | null;
  coverLetter?: FileRef | null;
  answers: { questionId: string; question: string; answer: string }[];
  history: StatusHistoryEntry[];
  notes?: ApplicationNote[]; // staff only
  interviews?: Interview[];
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationNote {
  id: string;
  content: string;
  author: { id: string; name: string };
  createdAt: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  title: string;
  round: InterviewRound;
  status: InterviewStatus;
  scheduledAt: string;
  durationMinutes: number;
  timezone: string;
  meetingUrl?: string | null;
  location?: string | null;
  notes?: string | null;
  interviewers: { id: string; name: string; email: string }[];
  feedback: InterviewFeedback[];
  candidate?: { id: string; name: string; email: string };
  job?: { id: string; title: string; slug: string };
  createdAt: string;
}

export interface InterviewFeedback {
  id: string;
  interviewer: { id: string; name: string };
  rating: number; // 1-5
  decision: InterviewDecision;
  strengths?: string | null;
  weaknesses?: string | null;
  comments: string;
  createdAt: string;
}

export interface ContactLead {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  country?: string | null;
  service?: { id: string; title: string; slug: string } | null;
  serviceInterest?: string | null;
  message: string;
  status: LeadStatus;
  source?: string | null;
  assignedTo?: { id: string; name: string } | null;
  notes?: { id: string; content: string; author: { id: string; name: string }; createdAt: string }[];
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  roles: RoleName[];
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface RoleWithPermissions {
  id: string;
  name: RoleName;
  description?: string | null;
  permissions: Permission[];
  userCount: number;
}

export interface AuditLogEntry {
  id: string;
  actor?: { id: string; name: string; email: string } | null;
  action: string; // e.g. "job.update"
  entityType: string;
  entityId?: string | null;
  changes?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
  updatedAt: string;
}

/** Website settings, grouped. `GET /settings/public` returns the non-secret subset. */
export interface WebsiteSettings {
  company: {
    name: string;
    tagline: string;
    description: string;
    email: string;
    phone: string;
    address: string;
    mapEmbedUrl: string;
  };
  branding: {
    logoUrl?: string | null;
    faviconUrl?: string | null;
    primaryColor: string;
    accentColor: string;
  };
  social: Record<string, string>;
  seo: {
    defaultTitle: string;
    titleTemplate: string;
    defaultDescription: string;
    keywords: string[];
    ogImageUrl?: string | null;
    twitterHandle?: string | null;
  };
  analytics: {
    googleAnalyticsId?: string | null;
    googleTagManagerId?: string | null;
  };
  footer: {
    about: string;
    copyright: string;
  };
  legal: {
    privacyPolicy: string; // HTML
    terms: string; // HTML
  };
  /** Super-admin-only kill switches for optional public-site sections. */
  features: {
    techMarquee: boolean;
    companyIntro: boolean;
    industries: boolean;
    whyChooseUs: boolean;
    toolchain: boolean;
    testimonials: boolean;
    stats: boolean;
    jobsSection: boolean;
    leadership: boolean;
    certifications: boolean;
  };
  /** Admin only */
  email?: {
    fromName: string;
    fromAddress: string;
    notifyAddresses: string[];
  };
}

export interface SearchResults {
  jobs: Pick<JobSummary, 'id' | 'slug' | 'title' | 'location' | 'workMode'>[];
  services: Pick<Service, 'id' | 'slug' | 'title' | 'shortDescription'>[];
  technologies: Pick<Technology, 'id' | 'slug' | 'name' | 'categoryName'>[];
}

export interface DashboardSummary {
  totalLeads: number;
  newLeads: number;
  totalJobs: number;
  activeJobs: number;
  totalApplicants: number;
  applicationsThisMonth: number;
  interviewsScheduled: number;
  unreadMessages: number;
  visitors: number; // last 30 days unique sessions
  conversionRate: number; // leads / visitors, percent
}

export interface TimeSeriesPoint {
  date: string; // ISO date or "YYYY-MM"
  value: number;
}

export interface DashboardCharts {
  monthlyApplications: TimeSeriesPoint[];
  websiteVisitors: TimeSeriesPoint[];
  hiringFunnel: { stage: ApplicationStatus; count: number }[];
  leadSources: { source: string; count: number }[];
}

export interface AnalyticsReport {
  range: { from: string; to: string };
  visitors: TimeSeriesPoint[];
  pageViews: TimeSeriesPoint[];
  totals: {
    visitors: number;
    pageViews: number;
    leads: number;
    leadConversionRate: number;
    applications: number;
    activeJobs: number;
    interviewConversionRate: number; // interviews / applications, percent
    avgTimeToHireDays: number;
  };
  topPages: { path: string; views: number }[];
  applicantSources: { source: string; count: number }[];
  devices: { device: 'desktop' | 'mobile' | 'tablet' | 'other'; count: number }[];
  referrers: { referrer: string; count: number }[];
}
