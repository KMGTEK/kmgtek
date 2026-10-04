import { ArrowRightIcon, MailIcon, MapPinIcon, PhoneIcon, ShieldCheckIcon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Logo } from '@/components/brand/logo';
import { SocialIcon, type SocialKey } from '@/components/brand/social-icons';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { footerNav, legalNav } from '@/config/nav';
import { siteConfig } from '@/config/site';
import { getContentBlock, getSettings } from '@/lib/api/public';
import { cn, phoneToHref } from '@/lib/utils';

const KNOWN_SOCIAL_KEYS: SocialKey[] = ['linkedin', 'twitter', 'github', 'facebook', 'youtube', 'instagram'];

/**
 * Global footer: brand, navigation, contact details, social links and legal row.
 * Company info, footer copy and social links come from Website Settings (`/admin/settings`)
 * — always default-merged, so this renders correctly even before an admin customizes it.
 */
export async function SiteFooter({ className }: { className?: string }) {
  const [cta, settings] = await Promise.all([getContentBlock('footer.cta'), getSettings()]);
  const social = KNOWN_SOCIAL_KEYS.map((key) => ({ key, href: settings.social[key] })).filter(
    (item): item is { key: SocialKey; href: string } => Boolean(item.href),
  );

  return (
    <footer className={cn('bg-ink-950 text-ink-300 relative isolate overflow-hidden', className)}>
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.07]" />
      <div
        aria-hidden
        className="from-brand-500/20 pointer-events-none absolute -top-40 -right-24 -z-10 size-96 rounded-full bg-gradient-to-br to-transparent blur-3xl"
      />

      {/* CTA band */}
      <Container className="border-ink-800/80 border-b py-12 md:py-16">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {cta.title} <span className="gradient-text">{cta.titleHighlight}</span>.
            </h2>
            <p className="text-ink-400 mt-2 text-pretty">{cta.description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="gradient">
              <Link href="/contact">
                {siteConfig.primaryCta.label} <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-ink-700 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/careers">{siteConfig.secondaryCta.label}</Link>
            </Button>
          </div>
        </div>
      </Container>

      {/* Main footer */}
      <Container className="grid gap-10 py-12 md:py-16 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-5">
          <Logo variant="full" className="h-12 w-auto" src={settings.branding.logoUrl} />
          <p className="text-ink-400 max-w-sm text-sm leading-relaxed">{settings.footer.about}</p>
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-start gap-2.5">
              <MapPinIcon className="text-brand-400 mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{settings.company.address}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <PhoneIcon className="text-brand-400 size-4 shrink-0" aria-hidden />
              <a href={phoneToHref(settings.company.phone)} className="hover:text-white">
                {settings.company.phone}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <MailIcon className="text-brand-400 size-4 shrink-0" aria-hidden />
              <a href={`mailto:${settings.company.email}`} className="hover:text-white">
                {settings.company.email}
              </a>
            </li>
          </ul>
          {social.length ? (
            <div className="flex items-center gap-2">
              {social.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.key}
                  className="border-ink-800 hover:border-brand-500 hover:text-brand-400 grid size-9 place-items-center rounded-lg border transition-colors"
                >
                  <SocialIcon name={item.key} />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        {footerNav.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h3 className="font-display text-sm font-semibold tracking-wide text-white uppercase">
              {group.title}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-brand-400 transition-colors">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>

      {/* Legal row */}
      <div className="border-ink-800/80 border-t">
        <Container className="flex flex-col items-center justify-between gap-4 py-6 text-xs sm:flex-row">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <p>{settings.footer.copyright}</p>
            <a
              href="https://www.e-verify.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="border-ink-800 hover:border-brand-500 hover:text-white flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors"
              title="This employer participates in E-Verify"
            >
              <ShieldCheckIcon className="text-brand-400 size-3.5" aria-hidden />
              E-Verify Employer
            </a>
          </div>
          <ul className="flex flex-wrap items-center gap-5">
            {legalNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-brand-400 transition-colors">
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </footer>
  );
}
