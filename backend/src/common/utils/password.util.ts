import { compare, hash } from 'bcryptjs';

/** bcrypt work factor — 12 is the platform standard (see README → Security). */
export const BCRYPT_COST = 12;

export const hashPassword = (plain: string): Promise<string> => hash(plain, BCRYPT_COST);

/** Compare a candidate password against a stored hash (constant time inside bcrypt). */
export const verifyPassword = (plain: string, passwordHash: string): Promise<boolean> =>
  compare(plain, passwordHash);

/**
 * Dummy hash used to equalize response time when an account does not exist,
 * so login cannot be used to enumerate registered emails.
 */
export const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.uLrcKhYqkLuMEGUKvXRU8F5bYbkvGDu';
