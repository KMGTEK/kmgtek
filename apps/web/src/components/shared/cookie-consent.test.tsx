import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GoogleAnalytics } from '@/lib/analytics';
import { resetCookieConsent, setCookieConsent } from '@/lib/cookie-consent';

import { CookieConsentBanner, CookieSettingsButton } from './cookie-consent';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const STORAGE_KEY = 'kmg_cookie_consent';

beforeEach(() => {
  window.localStorage.clear();
  act(() => resetCookieConsent());
});

describe('CookieConsentBanner', () => {
  it('is shown to a first-time visitor with Accept and Decline', () => {
    render(<CookieConsentBanner />);

    expect(screen.getByRole('dialog', { name: 'Cookies on this site' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
  });

  it('closes and remembers "declined" when the visitor declines', async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);

    await user.click(screen.getByRole('button', { name: 'Decline' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('declined');
  });

  it('closes and remembers "accepted" when the visitor accepts', async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);

    await user.click(screen.getByRole('button', { name: 'Accept' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('accepted');
  });

  it('stays hidden once a choice has been made', () => {
    act(() => setCookieConsent('declined'));
    render(<CookieConsentBanner />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is shown again from the "Cookie settings" link', async () => {
    const user = userEvent.setup();
    act(() => setCookieConsent('accepted'));
    render(
      <>
        <CookieConsentBanner />
        <CookieSettingsButton />
      </>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cookie settings' }));

    expect(screen.getByRole('dialog', { name: 'Cookies on this site' })).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('GoogleAnalytics', () => {
  it('loads the tag only after cookies are accepted', async () => {
    const tag = () => document.querySelector('script[src*="googletagmanager.com"]');
    render(<GoogleAnalytics id="G-TEST123" />);
    expect(tag()).toBeNull();

    act(() => setCookieConsent('declined'));
    expect(tag()).toBeNull();

    act(() => setCookieConsent('accepted'));
    await waitFor(() => expect(tag()).not.toBeNull());
  });
});
