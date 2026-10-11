/**
 * TanStack Query key factory — every client-side query key lives here so that
 * invalidation stays predictable (`queryClient.invalidateQueries({ queryKey: qk.jobs.all })`).
 */
export const qk = {
  auth: {
    me: ['auth', 'me'] as const,
    providers: ['auth', 'providers'] as const,
  },
  search: (term: string) => ['search', term] as const,
  /** Public settings — no `settings:read` permission needed, safe for any staff role. */
  publicSettings: ['settings', 'public'] as const,
  notifications: {
    all: ['notifications'] as const,
    list: (params?: Record<string, unknown>) => ['notifications', 'list', params ?? {}] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
  me: {
    dashboard: ['me', 'dashboard'] as const,
    profile: ['me', 'profile'] as const,
    resumes: ['me', 'resumes'] as const,
    savedJobs: ['me', 'saved-jobs'] as const,
    applications: (params?: Record<string, unknown>) => ['me', 'applications', params ?? {}] as const,
    application: (id: string) => ['me', 'applications', id] as const,
  },
  jobs: {
    all: ['jobs'] as const,
    list: (params?: Record<string, unknown>) => ['jobs', 'list', params ?? {}] as const,
    detail: (slug: string) => ['jobs', 'detail', slug] as const,
    facets: ['jobs', 'facets'] as const,
  },
  admin: {
    dashboard: {
      summary: ['admin', 'dashboard', 'summary'] as const,
      charts: (months: number) => ['admin', 'dashboard', 'charts', months] as const,
    },
    analytics: (params?: Record<string, unknown>) => ['admin', 'analytics', params ?? {}] as const,
    jobs: {
      all: ['admin', 'jobs'] as const,
      list: (params?: Record<string, unknown>) => ['admin', 'jobs', 'list', params ?? {}] as const,
      detail: (id: string) => ['admin', 'jobs', 'detail', id] as const,
    },
    applications: {
      all: ['admin', 'applications'] as const,
      list: (params?: Record<string, unknown>) =>
        ['admin', 'applications', 'list', params ?? {}] as const,
      detail: (id: string) => ['admin', 'applications', 'detail', id] as const,
    },
    interviews: {
      all: ['admin', 'interviews'] as const,
      list: (params?: Record<string, unknown>) => ['admin', 'interviews', 'list', params ?? {}] as const,
      detail: (id: string) => ['admin', 'interviews', 'detail', id] as const,
    },
    departments: ['admin', 'job-categories'] as const,
    leads: {
      all: ['admin', 'leads'] as const,
      list: (params?: Record<string, unknown>) => ['admin', 'leads', 'list', params ?? {}] as const,
      detail: (id: string) => ['admin', 'leads', 'detail', id] as const,
    },
    caseStudies: (params?: Record<string, unknown>) => ['admin', 'case-studies', params ?? {}] as const,
    caseStudy: (id: string) => ['admin', 'case-studies', id] as const,
    services: (params?: Record<string, unknown>) => ['admin', 'services', params ?? {}] as const,
    service: (id: string) => ['admin', 'services', id] as const,
    technologies: (params?: Record<string, unknown>) => ['admin', 'technologies', params ?? {}] as const,
    technologyCategories: ['admin', 'technology-categories'] as const,
    testimonials: (params?: Record<string, unknown>) => ['admin', 'testimonials', params ?? {}] as const,
    team: (params?: Record<string, unknown>) => ['admin', 'team-members', params ?? {}] as const,
    users: {
      all: ['admin', 'users'] as const,
      list: (params?: Record<string, unknown>) => ['admin', 'users', 'list', params ?? {}] as const,
      detail: (id: string) => ['admin', 'users', 'detail', id] as const,
      assignable: (permission?: string) => ['admin', 'users', 'assignable', permission ?? 'any'] as const,
    },
    roles: ['admin', 'roles'] as const,
    emailTemplates: ['admin', 'email-templates'] as const,
    emailTemplate: (id: string) => ['admin', 'email-templates', id] as const,
    settings: ['admin', 'settings'] as const,
    contentBlocks: {
      list: ['admin', 'content-blocks'] as const,
      detail: (key: string) => ['admin', 'content-blocks', key] as const,
    },
    auditLogs: (params?: Record<string, unknown>) => ['admin', 'audit-logs', params ?? {}] as const,
  },
} as const;

export type QueryKeys = typeof qk;
