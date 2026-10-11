import type { EmailTemplateKey } from '@kmg/shared';

export interface EmailTemplateSeed {
  key: EmailTemplateKey;
  name: string;
  subject: string;
  html: string;
  variables: string[];
}

const button = (url: string, label: string) =>
  `<p style="margin:28px 0;"><a href="${url}" style="background:#F39C2C;color:#0B0B0F;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;display:inline-block;">${label}</a></p>`;

const signature = `<p style="margin-top:28px;">Warm regards,<br /><strong>The {{companyName}} Talent Team</strong></p>`;

/**
 * Professional defaults for every key in `EMAIL_TEMPLATE_KEYS`. Admins can edit
 * subject/body from Settings → Email templates; the seed never overwrites edits.
 */
export const EMAIL_TEMPLATES: EmailTemplateSeed[] = [
  {
    key: 'application.received.candidate',
    name: 'Application received (candidate)',
    subject: 'We received your application for {{jobTitle}}',
    html: `
<h2 style="margin-top:0;">Thanks for applying, {{name}}!</h2>
<p>We have received your application for <strong>{{jobTitle}}</strong>{{#if jobLocation}} in {{jobLocation}}{{/if}} and our recruiting team has started reviewing it.</p>
<p><strong>What happens next</strong></p>
<ol>
  <li>A recruiter reviews your profile against the role (typically within 3–5 business days).</li>
  <li>If there is a fit, we schedule a short introductory call.</li>
  <li>You will then move through the technical and final rounds described on the job page.</li>
</ol>
<p>You can follow the status of this application at any time in your candidate portal.</p>
${button('{{portalUrl}}', 'Track my application')}
<p style="color:#6b7280;font-size:13px;">Reference: {{applicationId}}</p>
${signature}`.trim(),
    variables: ['name', 'jobTitle', 'jobLocation', 'applicationId', 'portalUrl'],
  },
  {
    key: 'application.received.admin',
    name: 'Application received (staff notification)',
    subject: 'New application: {{jobTitle}} — {{candidateName}}',
    html: `
<h2 style="margin-top:0;">New application received</h2>
<table role="presentation" cellpadding="6" cellspacing="0" style="font-size:14px;">
  <tr><td style="color:#6b7280;">Role</td><td><strong>{{jobTitle}}</strong></td></tr>
  <tr><td style="color:#6b7280;">Candidate</td><td>{{candidateName}}</td></tr>
  <tr><td style="color:#6b7280;">Email</td><td>{{candidateEmail}}</td></tr>
  <tr><td style="color:#6b7280;">Phone</td><td>{{candidatePhone}}</td></tr>
  <tr><td style="color:#6b7280;">Experience</td><td>{{experienceYears}} years</td></tr>
  <tr><td style="color:#6b7280;">Location</td><td>{{candidateLocation}}</td></tr>
  <tr><td style="color:#6b7280;">Source</td><td>{{source}}</td></tr>
</table>
<p style="color:#6b7280;font-size:13px;">Résumé (and cover letter, if provided) are attached to this email.</p>
${button('{{applicationUrl}}', 'Review application')}`.trim(),
    variables: [
      'jobTitle',
      'candidateName',
      'candidateEmail',
      'candidatePhone',
      'candidateLocation',
      'experienceYears',
      'source',
      'applicationUrl',
    ],
  },
  {
    key: 'application.status_updated',
    name: 'Application status updated',
    subject: 'Update on your application for {{jobTitle}}',
    html: `
<h2 style="margin-top:0;">Hello {{name}},</h2>
<p>There is an update on your application for <strong>{{jobTitle}}</strong>.</p>
<p style="font-size:15px;">Current stage: <strong style="color:#F39C2C;">{{statusLabel}}</strong></p>
{{#if note}}<blockquote style="border-left:3px solid #F39C2C;margin:18px 0;padding:6px 16px;color:#374151;">{{note}}</blockquote>{{/if}}
<p>We will be in touch as soon as there is more news. You can always check the latest status in your portal.</p>
${button('{{portalUrl}}', 'View my application')}
${signature}`.trim(),
    variables: ['name', 'jobTitle', 'status', 'statusLabel', 'note', 'portalUrl'],
  },
  {
    key: 'interview.scheduled',
    name: 'Interview scheduled',
    subject: 'Your {{round}} interview for {{jobTitle}} is scheduled',
    html: `
<h2 style="margin-top:0;">Hello {{name}},</h2>
<p>Your <strong>{{round}}</strong> interview for <strong>{{jobTitle}}</strong> has been scheduled. A calendar invitation is attached to this email.</p>
<table role="presentation" cellpadding="6" cellspacing="0" style="font-size:14px;">
  <tr><td style="color:#6b7280;">When</td><td><strong>{{formatDateTime scheduledAt timezone}}</strong> ({{timezone}})</td></tr>
  <tr><td style="color:#6b7280;">Duration</td><td>{{durationMinutes}} minutes</td></tr>
  <tr><td style="color:#6b7280;">Interviewers</td><td>{{interviewers}}</td></tr>
  {{#if location}}<tr><td style="color:#6b7280;">Location</td><td>{{location}}</td></tr>{{/if}}
</table>
{{#if meetingUrl}}${button('{{meetingUrl}}', 'Join the interview')}{{/if}}
<p><strong>How to prepare:</strong> review the role description, have examples of recent work ready, and join a few minutes early to check your audio and video. If you need to reschedule, reply to this email.</p>
${signature}`.trim(),
    variables: [
      'name',
      'jobTitle',
      'round',
      'scheduledAt',
      'timezone',
      'durationMinutes',
      'interviewers',
      'meetingUrl',
      'location',
    ],
  },
  {
    key: 'offer.released',
    name: 'Offer released',
    subject: 'Your offer from {{companyName}} for {{jobTitle}}',
    html: `
<h2 style="margin-top:0;">Congratulations, {{name}}!</h2>
<p>We are delighted to offer you the position of <strong>{{jobTitle}}</strong> at {{companyName}}. Everyone you met was impressed, and we would love to have you on the team.</p>
<p>Your formal offer letter, including compensation, benefits and your proposed start date, is available in your candidate portal. Please review it and let us know if you have any questions — we are happy to walk through the details on a call.</p>
${button('{{portalUrl}}', 'View my offer')}
<p>If anything is unclear, reply to this email or contact us at <a href="mailto:{{companyEmail}}">{{companyEmail}}</a>.</p>
${signature}`.trim(),
    variables: ['name', 'jobTitle', 'portalUrl'],
  },
  {
    key: 'contact.received.admin',
    name: 'New contact enquiry (staff notification)',
    subject: 'New enquiry from {{name}}{{#if company}} ({{company}}){{/if}}',
    html: `
<h2 style="margin-top:0;">New website enquiry</h2>
<table role="presentation" cellpadding="6" cellspacing="0" style="font-size:14px;">
  <tr><td style="color:#6b7280;">Name</td><td><strong>{{name}}</strong></td></tr>
  <tr><td style="color:#6b7280;">Email</td><td><a href="mailto:{{email}}">{{email}}</a></td></tr>
  <tr><td style="color:#6b7280;">Company</td><td>{{company}}</td></tr>
  <tr><td style="color:#6b7280;">Phone</td><td>{{phone}}</td></tr>
  <tr><td style="color:#6b7280;">Interested in</td><td>{{serviceInterest}}</td></tr>
  <tr><td style="color:#6b7280;">Source</td><td>{{source}}</td></tr>
</table>
<blockquote style="border-left:3px solid #F39C2C;margin:18px 0;padding:6px 16px;color:#374151;">{{message}}</blockquote>
${button('{{leadUrl}}', 'Open in admin')}`.trim(),
    variables: ['name', 'email', 'company', 'phone', 'serviceInterest', 'message', 'source', 'leadUrl'],
  },
  {
    key: 'contact.received.visitor',
    name: 'Contact enquiry acknowledgement (visitor)',
    subject: 'Thanks for contacting {{companyName}}',
    html: `
<h2 style="margin-top:0;">Thank you, {{name}}.</h2>
<p>We have received your message and a member of our team will get back to you within one business day.</p>
<p>In the meantime, you may find these useful:</p>
<ul>
  <li><a href="{{siteUrl}}/services">Our services</a> — Cloud, DevOps, Platform Engineering and AI.</li>
  <li><a href="{{siteUrl}}/case-studies">Case studies</a> — outcomes we have delivered for clients.</li>
  <li><a href="{{siteUrl}}/careers">Careers</a> — if you were writing about a role.</li>
</ul>
${signature}`.trim(),
    variables: ['name'],
  },
  {
    key: 'lead.assigned',
    name: 'Lead assigned to you',
    subject: 'New lead assigned: {{leadName}}',
    html: `
<h2 style="margin-top:0;">A lead was assigned to you</h2>
<p>{{assigneeName}}, the enquiry below now needs your follow-up.</p>
<table role="presentation" cellpadding="6" cellspacing="0" style="font-size:14px;">
  <tr><td style="color:#6b7280;">Name</td><td><strong>{{leadName}}</strong></td></tr>
  <tr><td style="color:#6b7280;">Email</td><td><a href="mailto:{{leadEmail}}">{{leadEmail}}</a></td></tr>
  <tr><td style="color:#6b7280;">Interested in</td><td>{{serviceInterest}}</td></tr>
</table>
<blockquote style="border-left:3px solid #F39C2C;margin:18px 0;padding:6px 16px;color:#374151;">{{message}}</blockquote>
${button('{{leadUrl}}', 'Open in admin')}`.trim(),
    variables: ['assigneeName', 'leadName', 'leadEmail', 'serviceInterest', 'message', 'leadUrl'],
  },
  {
    key: 'auth.password_reset',
    name: 'Password reset',
    subject: 'Reset your {{companyName}} password',
    html: `
<h2 style="margin-top:0;">Password reset requested</h2>
<p>Hello {{name}}, we received a request to reset the password for <strong>{{email}}</strong>.</p>
${button('{{resetUrl}}', 'Choose a new password')}
<p>This link expires in {{expiresInMinutes}} minutes and can be used once.</p>
<p style="color:#6b7280;font-size:13px;">If you did not request a password reset you can safely ignore this email — your password will not change.</p>`.trim(),
    variables: ['name', 'email', 'resetUrl', 'expiresInMinutes'],
  },
  {
    key: 'auth.welcome',
    name: 'Welcome (new candidate account)',
    subject: 'Welcome to {{companyName}}',
    html: `
<h2 style="margin-top:0;">Welcome aboard, {{name}}!</h2>
<p>Your candidate account is ready. From your portal you can complete your profile, upload resumes, save roles and track every application in one place.</p>
${button('{{portalUrl}}', 'Go to my portal')}
<p><strong>Three things worth doing first</strong></p>
<ol>
  <li>Complete your profile — a complete profile gets noticed by recruiters much faster.</li>
  <li>Upload your latest resume and mark it as primary.</li>
  <li><a href="{{jobsUrl}}">Browse open roles</a> and save the ones that interest you.</li>
</ol>
${signature}`.trim(),
    variables: ['name', 'portalUrl', 'jobsUrl'],
  },
];
