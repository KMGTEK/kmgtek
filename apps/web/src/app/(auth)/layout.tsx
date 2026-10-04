import { ArrowLeftIcon, CheckIcon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { COMPANY } from '@kmg/shared';

import { Logo, LogoLink } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/shared/theme-toggle';

const HIGHLIGHTS = [
  'Track every application in one place',
  'Save jobs and get matched to new roles',
  'Upload multiple resumes and reuse them',
  'Interview invites, reminders and feedback',
];

/**
 * Split-screen auth shell: form on the left, brand panel on the right.
 * Pages under `src/app/(auth)/` (login, register, forgot/reset password) inherit it.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col">
        <header className="flex items-center justify-between p-6">
          <LogoLink variant="wordmark" className="h-8 w-auto" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
            >
              <ArrowLeftIcon className="size-4" aria-hidden />
              Back to site
            </Link>
          </div>
        </header>
        <main id="main-content" className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
        <footer className="text-muted-foreground p-6 text-xs">
          © {new Date().getFullYear()} {COMPANY.legalName}
        </footer>
      </div>

      {/* Brand side */}
      <aside className="bg-ink-950 relative hidden overflow-hidden lg:block">
        <div aria-hidden className="bg-grid absolute inset-0 opacity-[0.08]" />
        <div
          aria-hidden
          className="from-brand-500/25 absolute -top-32 -left-24 size-[28rem] rounded-full bg-gradient-to-br to-transparent blur-3xl"
        />
        <div
          aria-hidden
          className="from-ember-500/20 absolute -right-24 -bottom-32 size-[26rem] rounded-full bg-gradient-to-tr to-transparent blur-3xl"
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo variant="full" className="h-14 w-auto" />
          <div className="max-w-md">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white">
              Your career, <span className="gradient-text">tracked end to end</span>.
            </h2>
            <p className="text-ink-400 mt-3 text-pretty">{COMPANY.tagline}</p>
            <ul className="mt-8 space-y-3">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="text-ink-200 flex items-start gap-3 text-sm">
                  <span className="bg-brand-500/15 text-brand-400 mt-0.5 grid size-5 shrink-0 place-items-center rounded-full">
                    <CheckIcon className="size-3" aria-hidden />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-ink-500 text-xs">
            {COMPANY.address.full} · {COMPANY.phone}
          </p>
        </div>
      </aside>
    </div>
  );
}
