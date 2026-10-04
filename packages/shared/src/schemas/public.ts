import { z } from 'zod';
import { coercedNumber, optionalString, optionalUrl, phoneSchema } from './common';

const optionalPhone = z
  .union([z.literal(''), phoneSchema])
  .optional()
  .transform((v): string | undefined => (v === '' || v === undefined ? undefined : v));

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(120),
  email: z.email('Enter a valid email').trim().toLowerCase(),
  company: optionalString(160),
  phone: optionalPhone,
  country: optionalString(80),
  serviceInterest: optionalString(160),
  message: z.string().trim().min(10, 'Tell us a little more (10+ characters)').max(5000),
  source: optionalString(80),
  /**
   * Honeypot — real visitors never fill this (it's hidden from the rendered form).
   * Deliberately accepts any value instead of rejecting it at validation time: the API
   * contract requires a filled honeypot to still 201 (silently, without creating a lead)
   * rather than reveal the check with a 400.
   */
  website: optionalString(200),
});
export type ContactInput = z.infer<typeof contactSchema>;

/**
 * Job application form. Sent as multipart/form-data to POST /jobs/:slug/apply with
 * files `resume` (required unless `resumeId` given) and `coverLetter` (optional).
 * `answers` is a JSON string: [{ questionId, answer }].
 */
export const jobApplicationSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(120),
  email: z.email('Enter a valid email').trim().toLowerCase(),
  phone: phoneSchema,
  currentLocation: z.string().trim().min(2, 'Enter your location').max(120),
  currentCompany: optionalString(160),
  experienceYears: coercedNumber(z.number().min(0, 'Invalid').max(60, 'Invalid')),
  currentCtc: optionalString(60),
  expectedCtc: optionalString(60),
  noticePeriod: optionalString(60),
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  resumeId: optionalString(64),
  answers: optionalString(10000),
  source: optionalString(80),
  consent: z
    .union([z.literal(true), z.literal('true'), z.literal('on')])
    .transform(() => true as const)
    .refine((v) => v === true, 'You must accept to continue'),
});
export type JobApplicationInput = z.input<typeof jobApplicationSchema>;
export type JobApplicationData = z.output<typeof jobApplicationSchema>;

export const jobsQuerySchema = z.object({
  page: coercedNumber(z.number().int().min(1)).default(1),
  pageSize: coercedNumber(z.number().int().min(1).max(50)).default(10),
  search: optionalString(200),
  location: optionalString(120),
  department: optionalString(120),
  technology: optionalString(80),
  employmentType: optionalString(40),
  workMode: optionalString(40), // comma separated WorkMode list
  experienceMin: coercedNumber(z.number().min(0)).optional(),
  experienceMax: coercedNumber(z.number().min(0)).optional(),
  sort: z.enum(['newest', 'oldest', 'title']).default('newest'),
});
export type JobsQuery = z.infer<typeof jobsQuerySchema>;

export const trackEventSchema = z.object({
  path: z.string().max(500),
  referrer: optionalString(500),
  sessionId: z.string().min(8).max(64),
  title: optionalString(200),
  utmSource: optionalString(100),
  utmMedium: optionalString(100),
  utmCampaign: optionalString(100),
});
export type TrackEventInput = z.infer<typeof trackEventSchema>;
