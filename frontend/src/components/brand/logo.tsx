import Link from 'next/link';
import * as React from 'react';

import { COMPANY } from '@kmg/shared';

import { cn } from '@/lib/utils';

/**
 * Brand logo, inlined as SVG so it inherits the theme (the file in /public has a
 * white box background that does not work on dark surfaces).
 *
 * - `variant="full"`    → wordmark + vertical "TECHNOLOGIES" (header/footer)
 * - `variant="wordmark"`→ letters only, no frame (compact headers)
 * - `variant="mark"`    → square app icon (favicons, avatars, mobile)
 */
export type LogoVariant = 'full' | 'wordmark' | 'mark';

export interface LogoProps extends React.SVGProps<SVGSVGElement> {
  variant?: LogoVariant;
  className?: string;
  /** Renders the frame that the printed logo has (light surfaces only). */
  framed?: boolean;
  /**
   * Admin-uploaded logo (Website Settings → Branding → Logo). When set, renders this image
   * instead of the built-in vector mark — use a transparent PNG/SVG so it works on both
   * light and dark surfaces.
   */
  src?: string | null;
}

export function Logo({ variant = 'full', className, framed = false, src, ...props }: LogoProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-uploaded URL, unknown dimensions
      <img
        src={src}
        alt={`${COMPANY.displayName} logo`}
        className={cn(variant === 'mark' ? 'size-8 object-contain' : 'h-9 w-auto object-contain', className)}
      />
    );
  }

  if (variant === 'mark') {
    return (
      <svg
        viewBox="0 0 64 64"
        role="img"
        aria-label={`${COMPANY.displayName} logo`}
        className={cn('h-8 w-8', className)}
        {...props}
      >
        <rect x="2" y="2" width="60" height="60" rx="12" className="fill-brand-500" />
        <path fill="#fff" d="M13 16h7v32h-7zM20 30l10-14h8L27 32l12 16h-8.5z" />
        <rect x="42" y="36" width="5" height="12" rx="1" fill="#fff" />
        <rect x="50" y="25" width="5" height="23" rx="1" className="fill-ember-500" />
      </svg>
    );
  }

  const showTechnologies = variant === 'full';

  return (
    <svg
      viewBox={showTechnologies ? '0 0 400 150' : '10 10 340 130'}
      role="img"
      aria-label={`${COMPANY.displayName} logo`}
      className={cn('h-9 w-auto', className)}
      {...props}
    >
      {framed && (
        <rect
          x="4"
          y="4"
          width="392"
          height="142"
          className="fill-transparent stroke-brand-500"
          strokeWidth={8}
        />
      )}
      <g className="fill-brand-500">
        {/* K */}
        <rect x="22" y="22" width="30" height="106" />
        <polygon points="52,66 96,22 132,22 76,78" />
        <polygon points="68,86 90,68 136,128 100,128" />
        {/* M */}
        <rect x="142" y="22" width="28" height="106" />
        <polygon points="170,22 204,78 238,22 238,62 204,114 170,62" />
        <rect x="238" y="22" width="28" height="106" />
        {/* G */}
        <path d="M338 22H290a14 14 0 0 0-14 14v78a14 14 0 0 0 14 14h48v-28h-34V50h34z" />
      </g>
      {/* Bar chart — orange + red accent, matches the printed logo in every theme */}
      <rect x="314" y="88" width="14" height="40" className="fill-brand-500" />
      <rect x="332" y="66" width="14" height="62" className="fill-ember-500" />
      {showTechnologies && (
        <text
          x="372"
          y="75"
          className="fill-brand-500"
          fontFamily="var(--font-display), system-ui, sans-serif"
          fontSize="13"
          fontWeight="700"
          letterSpacing="1.5"
          textAnchor="middle"
          transform="rotate(90 372 75)"
        >
          TECHNOLOGIES
        </text>
      )}
    </svg>
  );
}

/** Logo wrapped in a link to the home page — the standard header/footer usage. */
export function LogoLink({
  variant = 'full',
  className,
  href = '/',
  label,
  src,
}: {
  variant?: LogoVariant;
  className?: string;
  href?: string;
  label?: string;
  src?: string | null;
}) {
  return (
    <Link
      href={href}
      aria-label={`${COMPANY.displayName} — home`}
      className="focus-ring inline-flex items-center gap-2.5 rounded-md"
    >
      <Logo variant={variant} className={className} src={src} />
      {label ? <span className="font-display text-base font-semibold tracking-tight">{label}</span> : null}
    </Link>
  );
}
