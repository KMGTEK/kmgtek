import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SiteHeader } from './site-header';

const auth = vi.hoisted(() => ({
  state: { isAuthenticated: false, isStaff: false, logout: vi.fn() },
}));

vi.mock('@/lib/auth/auth-provider', () => ({ useAuth: () => auth.state }));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/components/shared/global-search', () => ({ GlobalSearchTrigger: () => null }));
vi.mock('@/components/shared/theme-toggle', () => ({ ThemeToggle: () => null }));

const company = { tagline: 'Tagline', email: 'contactus@kmgtek.com' };

beforeEach(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  auth.state = { isAuthenticated: false, isStaff: false, logout: vi.fn() };
});

describe('SiteHeader account links', () => {
  it('shows no Admin or Sign out to an anonymous visitor', () => {
    render(<SiteHeader company={company} />);

    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  it('shows Admin and a Sign out button to a signed-in admin, and signs out to the homepage', async () => {
    auth.state = { isAuthenticated: true, isStaff: true, logout: vi.fn() };
    const user = userEvent.setup();
    render(<SiteHeader company={company} />);

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(auth.state.logout).toHaveBeenCalledWith({ redirectTo: '/' });
  });

  it('does not list Contact in the main menu', () => {
    render(<SiteHeader company={company} />);

    expect(screen.queryByRole('link', { name: 'Contact' })).not.toBeInTheDocument();
  });
});
