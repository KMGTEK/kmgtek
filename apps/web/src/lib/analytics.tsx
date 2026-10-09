'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { useCookieConsent } from '@/lib/cookie-consent';
import { API_BASE_PATH, publicEnv } from '@/lib/env';

const SESSION_KEY = 'kmg_sid';
/** Paths we never track (private surfaces). */
const IGNORED_PREFIXES = ['/admin', '/portal', '/design-system', '/auth'];

function sessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, '');
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

/** Fire-and-forget page-view beacon to `POST /api/v1/analytics/track`. Never throws. */
export function trackPageView(path: string, title?: string) {
  if (typeof window === 'undefined') return;
  if (IGNORED_PREFIXES.some((prefix) => path.startsWith(prefix))) return;

  const sid = sessionId();
  if (!sid) return;

  const params = new URLSearchParams(window.location.search);
  const payload = JSON.stringify({
    path,
    title: title ?? document.title,
    referrer: document.referrer || undefined,
    sessionId: sid,
    utmSource: params.get('utm_source') ?? undefined,
    utmMedium: params.get('utm_medium') ?? undefined,
    utmCampaign: params.get('utm_campaign') ?? undefined,
  });

  try {
    const url = `${API_BASE_PATH}/analytics/track`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
      return;
    }
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Analytics must never break the page.
  }
}

/** Mount once in the root layout (inside <Suspense>) to record client-side navigations. */
export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const consent = useCookieConsent();

  React.useEffect(() => {
    if (!pathname || consent !== 'accepted') return;
    const query = searchParams?.toString();
    trackPageView(query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams, consent]);

  return null;
}

/**
 * Google Analytics 4. `id` normally comes from Website Settings → Analytics
 * (`settings.analytics.googleAnalyticsId`, admin-editable, no redeploy needed); falls back
 * to the build-time `NEXT_PUBLIC_GA_ID` env var, then renders nothing if neither is set.
 */
export function GoogleAnalytics({ id: idProp }: { id?: string | null } = {}) {
  const consent = useCookieConsent();
  const id = idProp ?? publicEnv.gaId;
  if (!id || consent !== 'accepted') return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}',{anonymize_ip:true});`}
      </Script>
    </>
  );
}

/** Custom GA event (no-op when GA is not configured). */
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  gtag?.('event', name, params);
}
