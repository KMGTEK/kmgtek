import { z } from 'zod';
import { optionalCoercedNumber, optionalString, optionalUrl } from './common';

export const candidateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: optionalString(20),
  location: optionalString(120),
  headline: optionalString(160),
  summary: optionalString(3000),
  currentCompany: optionalString(160),
  experienceYears: optionalCoercedNumber(z.number().min(0).max(60)),
  currentCtc: optionalString(60),
  expectedCtc: optionalString(60),
  noticePeriod: optionalString(60),
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  portfolioUrl: optionalUrl,
});
export type CandidateProfileInput = z.input<typeof candidateProfileSchema>;

export const candidateSkillsSchema = z.object({
  skills: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
        years: optionalCoercedNumber(z.number().min(0).max(60)),
      }),
    )
    .max(50),
});
export type CandidateSkillsInput = z.infer<typeof candidateSkillsSchema>;
