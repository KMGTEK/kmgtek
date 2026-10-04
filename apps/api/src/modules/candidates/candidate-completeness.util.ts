export interface CompletenessInput {
  phone?: string | null;
  location?: string | null;
  headline?: string | null;
  summary?: string | null;
  currentCompany?: string | null;
  experienceYears?: number | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  skillsCount: number;
  hasResume: boolean;
}

/**
 * Weighted 0-100 profile completeness score. Weights sum to 100:
 * phone 10, location 10, headline 10, summary 15, currentCompany 5,
 * experienceYears 10, a professional link 10, skills 15, resume 15.
 */
export function computeProfileCompleteness(input: CompletenessInput): number {
  let score = 0;
  if (input.phone) score += 10;
  if (input.location) score += 10;
  if (input.headline) score += 10;
  if (input.summary) score += 15;
  if (input.currentCompany) score += 5;
  if (input.experienceYears !== null && input.experienceYears !== undefined) score += 10;
  if (input.linkedinUrl || input.githubUrl || input.portfolioUrl) score += 10;
  if (input.skillsCount > 0) score += 15;
  if (input.hasResume) score += 15;
  return Math.min(100, score);
}
