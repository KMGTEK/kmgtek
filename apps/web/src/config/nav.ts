import { COMPANY, INDUSTRIES, SERVICES, type Permission } from '@kmg/shared';

/**
 * Single source of truth for navigation. Marketing, portal and admin agents should add
 * entries here rather than hard-coding links in layouts.
 */

export interface NavItem {
  title: string;
  href: string;
  description?: string;
  /** lucide icon name (PascalCase) — rendered with `<DynamicIcon />`. */
  icon?: string;
  external?: boolean;
  badge?: string;
  /** Admin only: hide the item unless the user holds this permission. */
  permission?: Permission;
  /** Match child routes for active state (default: exact match). */
  exact?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
  permission?: Permission;
}

/* -------------------------------------------------------------------------- */
/* Marketing                                                                   */
/* -------------------------------------------------------------------------- */

/** All services, for the header mega-menu and the footer. */
export const serviceNavItems: NavItem[] = SERVICES.map((service) => ({
  title: service.title,
  href: `/services/${service.slug}`,
  description: service.shortDescription,
  icon: service.icon,
}));

export const industryNavItems: NavItem[] = INDUSTRIES.map((industry) => ({
  title: industry.name,
  href: `/industries#${industry.slug}`,
  description: industry.description,
  icon: industry.icon,
}));

export interface MarketingNavEntry extends NavItem {
  /** Renders a mega-menu instead of a plain link. */
  children?: NavItem[];
  /** Layout hint for the mega-menu. */
  layout?: 'services' | 'simple';
}

export const marketingNav: MarketingNavEntry[] = [
  {
    title: 'Services',
    href: '/services',
    layout: 'services',
    children: serviceNavItems,
  },
  { title: 'Technologies', href: '/technologies' },
  { title: 'Careers', href: '/careers' },
  { title: 'About', href: '/about' },
  { title: 'Contact', href: '/contact' },
];

export const footerNav: NavGroup[] = [
  {
    title: 'Services',
    items: serviceNavItems.slice(0, 6),
  },
  {
    title: 'Company',
    items: [
      { title: 'About us', href: '/about' },
      { title: 'Technologies', href: '/technologies' },
      { title: 'Industries', href: '/industries' },
      { title: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Careers',
    items: [
      { title: 'Open positions', href: '/careers' },
      { title: 'Search', href: '/search' },
    ],
  },
];

export const legalNav: NavItem[] = [
  { title: 'Privacy Policy', href: '/privacy' },
  { title: 'Terms of Service', href: '/terms' },
  { title: 'Sitemap', href: '/sitemap.xml' },
];

export const socialNav = [
  { title: 'LinkedIn', href: COMPANY.social.linkedin, key: 'linkedin' as const },
  { title: 'X', href: COMPANY.social.twitter, key: 'twitter' as const },
  { title: 'GitHub', href: COMPANY.social.github, key: 'github' as const },
  { title: 'Facebook', href: COMPANY.social.facebook, key: 'facebook' as const },
  { title: 'YouTube', href: COMPANY.social.youtube, key: 'youtube' as const },
].filter((item) => Boolean(item.href));

/* -------------------------------------------------------------------------- */
/* Candidate portal                                                            */
/* -------------------------------------------------------------------------- */

export const portalNav: NavItem[] = [
  { title: 'Dashboard', href: '/portal', icon: 'LayoutDashboard', exact: true },
  { title: 'My Profile', href: '/portal/profile', icon: 'User' },
  { title: 'Resumes', href: '/portal/resumes', icon: 'FileText' },
  { title: 'Applications', href: '/portal/applications', icon: 'Send' },
  { title: 'Saved Jobs', href: '/portal/saved-jobs', icon: 'Bookmark' },
  { title: 'Notifications', href: '/portal/notifications', icon: 'Bell' },
  { title: 'Settings', href: '/portal/settings', icon: 'Settings' },
];

/* -------------------------------------------------------------------------- */
/* Admin                                                                       */
/* -------------------------------------------------------------------------- */

export const adminNav: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { title: 'Dashboard', href: '/admin', icon: 'LayoutDashboard', permission: 'dashboard:read', exact: true },
      { title: 'Analytics', href: '/admin/analytics', icon: 'ChartLine', permission: 'analytics:read' },
    ],
  },
  {
    title: 'Recruitment',
    items: [
      { title: 'Jobs', href: '/admin/jobs', icon: 'Briefcase', permission: 'jobs:read' },
      { title: 'Applications', href: '/admin/applications', icon: 'Users', permission: 'applications:read' },
      { title: 'Interviews', href: '/admin/interviews', icon: 'CalendarDays', permission: 'interviews:read' },
      { title: 'Departments', href: '/admin/departments', icon: 'Building2', permission: 'jobs:write' },
    ],
  },
  {
    title: 'Sales',
    items: [{ title: 'Leads', href: '/admin/leads', icon: 'Handshake', permission: 'leads:read' }],
  },
  {
    title: 'Content',
    items: [
      { title: 'Case Studies', href: '/admin/case-studies', icon: 'BookOpen', permission: 'content:read' },
      { title: 'Services', href: '/admin/services', icon: 'Sparkles', permission: 'content:read' },
      { title: 'Technologies', href: '/admin/technologies', icon: 'Cpu', permission: 'content:read' },
      { title: 'Testimonials', href: '/admin/testimonials', icon: 'Quote', permission: 'content:read' },
      { title: 'Team', href: '/admin/team', icon: 'UsersRound', permission: 'content:read' },
      { title: 'Page Content', href: '/admin/content', icon: 'FileEdit', permission: 'content:read' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { title: 'Users & Roles', href: '/admin/users', icon: 'ShieldCheck', permission: 'users:read' },
      { title: 'Email Templates', href: '/admin/email-templates', icon: 'Mail', permission: 'settings:read' },
      { title: 'Website Settings', href: '/admin/settings', icon: 'Settings', permission: 'settings:read' },
      { title: 'Audit Logs', href: '/admin/audit-logs', icon: 'ScrollText', permission: 'audit:read' },
    ],
  },
];

/** Filter admin navigation by the signed-in user's permissions. */
export function filterNavByPermissions(groups: NavGroup[], can: (permission: Permission) => boolean): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || can(item.permission)),
    }))
    .filter((group) => group.items.length > 0 && (!group.permission || can(group.permission)));
}

/** Active-state helper shared by every sidebar/nav. */
export function isNavItemActive(pathname: string, item: Pick<NavItem, 'href' | 'exact'>): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
