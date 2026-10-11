'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { resetCookieConsent, setCookieConsent, useCookieConsent } from '@/lib/cookie-consent';

/** First-visit banner: essential cookies always on, analytics only after "Accept". */
export function CookieConsentBanner() {
  const consent = useCookieConsent();
  if (consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      className="bg-background/95 fixed inset-x-3 bottom-3 z-60 mx-auto max-w-xl rounded-xl border p-4 shadow-lg backdrop-blur sm:inset-x-auto sm:right-4 sm:bottom-4 sm:mx-0 sm:p-5"
    >
      <h2 id="cookie-consent-title" className="font-display text-sm font-semibold">
        Cookies on this site
      </h2>
      <p id="cookie-consent-description" className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
        We use essential cookies to keep the site working. With your permission we also use analytics cookies to
        understand how it is used. See our{' '}
        <Link href="/privacy" className="text-foreground underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setCookieConsent('declined')}>
          Decline
        </Button>
        <Button type="button" variant="gradient" size="sm" onClick={() => setCookieConsent('accepted')}>
          Accept
        </Button>
      </div>
    </div>
  );
}

/** Footer link that reopens the banner so a visitor can change their choice. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={resetCookieConsent} className={className}>
      Cookie settings
    </button>
  );
}
