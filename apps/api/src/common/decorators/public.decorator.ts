import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'kmg:isPublic';
export const OPTIONAL_AUTH_KEY = 'kmg:optionalAuth';

/** Skip authentication entirely for this route/controller. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Authenticate when a bearer token is present, but do not reject anonymous
 * callers (used by the public apply flow, which links to a logged-in candidate).
 */
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH_KEY, true);
