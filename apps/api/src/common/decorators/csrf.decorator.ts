import { SetMetadata } from '@nestjs/common';

export const CSRF_PROTECTED_KEY = 'kmg:csrfProtected';

/**
 * Mark a cookie-authenticated endpoint (`/auth/refresh`, `/auth/logout`) as
 * requiring the `X-Requested-With: XMLHttpRequest` header and an allow-listed Origin.
 */
export const CsrfProtected = () => SetMetadata(CSRF_PROTECTED_KEY, true);
