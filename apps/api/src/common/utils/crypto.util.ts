import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** URL-safe random token (used for refresh + password-reset tokens). */
export const randomToken = (bytes = 48): string => randomBytes(bytes).toString('base64url');

/** Tokens are only ever stored as a sha256 digest. */
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

export const hmac = (secret: string, value: string): string =>
  createHmac('sha256', secret).update(value).digest('hex');

/** Constant-time string comparison (never leaks length-independent timing). */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still do a comparison so the branch cost stays roughly constant.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
