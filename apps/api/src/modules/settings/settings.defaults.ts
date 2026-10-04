import { BRAND_COLORS, COMPANY, type WebsiteSettings } from '@kmg/shared';

export const SETTINGS_GROUPS = [
  'company',
  'branding',
  'social',
  'seo',
  'analytics',
  'footer',
  'legal',
  'features',
  'email',
] as const;
export type SettingsGroupName = (typeof SETTINGS_GROUPS)[number];

/** Groups never exposed by `GET /settings/public`. */
export const PRIVATE_SETTINGS_GROUPS: SettingsGroupName[] = ['email'];

const PRIVACY_POLICY = `
<h2>Privacy Policy</h2>
<p><em>Last updated: January 1, ${new Date().getFullYear()}</em></p>
<p>${COMPANY.legalName} ("${COMPANY.shortName}", "we", "us") respects your privacy. This policy explains what
personal information we collect through ${COMPANY.website}, why we collect it, and the choices you have.</p>

<h3>Information we collect</h3>
<ul>
  <li><strong>Information you give us.</strong> Name, email address, phone number, company, resume/CV,
  employment history and any other details you submit through our contact or job application forms.</li>
  <li><strong>Information collected automatically.</strong> Pages viewed, referring URL, approximate location,
  device, browser and operating system, collected through first-party analytics.</li>
  <li><strong>Account information.</strong> If you create a candidate account we store your profile, saved jobs
  and application history so you can track their progress.</li>
</ul>

<h3>How we use your information</h3>
<ul>
  <li>To evaluate your application and communicate with you about roles and interviews.</li>
  <li>To respond to consulting enquiries and provide the services you request.</li>
  <li>To operate, secure and improve our website.</li>
  <li>To meet legal, tax and regulatory obligations.</li>
</ul>

<h3>Sharing</h3>
<p>We do not sell personal information. We share it only with service providers who process data on our behalf
(email delivery, cloud hosting, analytics), with a client where you have expressly agreed to be represented for a
role, and where required by law.</p>

<h3>Retention</h3>
<p>Candidate records are retained for up to 24 months after the last interaction unless you ask us to delete them
sooner, or unless a longer period is required by law.</p>

<h3>Your rights</h3>
<p>You may request access to, correction of, or deletion of your personal information, and you may object to or
restrict certain processing. Email <a href="mailto:${COMPANY.email}">${COMPANY.email}</a> and we will respond
within 30 days.</p>

<h3>Cookies</h3>
<p>We use strictly necessary cookies for authentication and, where enabled, first-party analytics cookies to
understand how the site is used. You can block cookies in your browser, though parts of the candidate portal will
stop working.</p>

<h3>Security</h3>
<p>Data is encrypted in transit, passwords are hashed, resumes are stored in private object storage and access is
restricted to authorized personnel.</p>

<h3>Contact</h3>
<p>${COMPANY.legalName}, ${COMPANY.address.full}. Email
<a href="mailto:${COMPANY.email}">${COMPANY.email}</a>, phone ${COMPANY.phone}.</p>
`.trim();

const TERMS = `
<h2>Terms of Service</h2>
<p><em>Last updated: January 1, ${new Date().getFullYear()}</em></p>
<p>These terms govern your use of ${COMPANY.website} and the services offered on it. By using the site you agree
to them.</p>

<h3>Use of the site</h3>
<p>You agree to use the site lawfully, to provide accurate information, and not to attempt to gain unauthorized
access, scrape at scale, or disrupt the service. Accounts are personal and must not be shared.</p>

<h3>Job applications</h3>
<p>Submitting an application does not create an employment relationship or any guarantee of an interview or offer.
You confirm that the information and documents you submit are truthful and that you have the right to work in the
jurisdiction of the role, or will disclose any sponsorship requirement.</p>

<h3>Consulting services</h3>
<p>Descriptions of services on this site are for information only and do not constitute an offer. Engagements are
governed by a separate written agreement (statement of work) between you and ${COMPANY.legalName}.</p>

<h3>Intellectual property</h3>
<p>All content on this site, including text, graphics, logos and case studies, is owned by ${COMPANY.legalName} or
its licensors and may not be reproduced without written permission. Content you submit remains yours; you grant us
a licence to use it for recruitment and service-delivery purposes.</p>

<h3>Disclaimer and liability</h3>
<p>The site is provided "as is" without warranties of any kind. To the maximum extent permitted by law,
${COMPANY.legalName} is not liable for indirect or consequential losses arising from use of the site.</p>

<h3>Changes</h3>
<p>We may update these terms; the "last updated" date will change and continued use constitutes acceptance.</p>

<h3>Governing law</h3>
<p>These terms are governed by the laws of the State of New Jersey, United States.</p>

<h3>Contact</h3>
<p>Questions? Email <a href="mailto:${COMPANY.email}">${COMPANY.email}</a>.</p>
`.trim();

/**
 * Factory defaults for every settings group. The seed writes these rows and the
 * settings service falls back to them for any group that is missing.
 */
export function defaultSettings(env?: {
  mailFromName?: string;
  mailFromAddress?: string;
  notifyAddresses?: string[];
}): Required<WebsiteSettings> {
  return {
    company: {
      name: COMPANY.displayName,
      tagline: COMPANY.tagline,
      description: COMPANY.description,
      email: COMPANY.email,
      phone: COMPANY.phone,
      address: COMPANY.address.full,
      mapEmbedUrl: COMPANY.mapEmbedUrl,
    },
    branding: {
      logoUrl: '/logo.svg',
      faviconUrl: '/favicon.ico',
      primaryColor: BRAND_COLORS.primary,
      accentColor: BRAND_COLORS.accent,
    },
    social: {
      linkedin: COMPANY.social.linkedin,
      // Twitter/X, GitHub and Facebook are disabled by default — clear via Website Settings →
      // Social to hide the icon, or fill in a URL to bring one back.
      twitter: '',
      github: '',
      facebook: '',
      youtube: COMPANY.social.youtube,
    },
    seo: {
      defaultTitle: `${COMPANY.displayName} — ${COMPANY.tagline}`,
      titleTemplate: `%s | ${COMPANY.displayName}`,
      defaultDescription: COMPANY.description,
      keywords: [
        'IT consulting',
        'DevOps consulting',
        'cloud migration',
        'Kubernetes consulting',
        'platform engineering',
        'SRE',
        'IT staffing',
        'contract to hire',
        'Edison NJ IT company',
      ],
      ogImageUrl: '/og-default.png',
      twitterHandle: '@kmgtek',
    },
    analytics: {
      googleAnalyticsId: null,
      googleTagManagerId: null,
    },
    footer: {
      about: COMPANY.description,
      copyright: `© ${new Date().getFullYear()} ${COMPANY.legalName}. All rights reserved.`,
    },
    legal: {
      privacyPolicy: PRIVACY_POLICY,
      terms: TERMS,
    },
    features: {
      techMarquee: true,
      companyIntro: true,
      industries: true,
      whyChooseUs: true,
      toolchain: true,
      testimonials: true,
      stats: true,
      jobsSection: true,
      leadership: false,
      certifications: false,
    },
    email: {
      fromName: env?.mailFromName ?? COMPANY.displayName,
      fromAddress: env?.mailFromAddress ?? COMPANY.email,
      notifyAddresses: env?.notifyAddresses ?? [COMPANY.email],
    },
  };
}
