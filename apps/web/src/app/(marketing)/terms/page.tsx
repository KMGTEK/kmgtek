import type { Metadata } from 'next';

import { COMPANY } from '@kmg/shared';

import { PageHero } from '@/components/layout/page-hero';
import { Section } from '@/components/layout/section';
import { RichText } from '@/components/shared/rich-text';
import { getSettings } from '@/lib/api/public';
import { buildMetadata } from '@/lib/seo';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = buildMetadata({
  title: 'Terms of Service',
  description: `The terms that govern your use of the ${COMPANY.displayName} website and candidate portal.`,
  path: '/terms',
});

const FALLBACK_TERMS = `
  <p>These terms govern your use of the ${COMPANY.displayName} website, candidate portal and related services.
  By using this site you agree to these terms.</p>
  <h2>Use of the site</h2>
  <p>You agree to use this website lawfully and not to submit false or misleading information through our
  contact or job application forms.</p>
  <h2>Intellectual property</h2>
  <p>All content on this site — including text, graphics and logos — is the property of ${COMPANY.legalName}
  unless otherwise noted.</p>
  <h2>Limitation of liability</h2>
  <p>This website is provided "as is" without warranties of any kind. ${COMPANY.legalName} is not liable for
  any damages arising from your use of the site.</p>
  <h2>Contact us</h2>
  <p>Questions about these terms can be directed to <a href="mailto:${COMPANY.email}">${COMPANY.email}</a>.</p>
  <p><em>This is placeholder copy pending the final terms from our legal team.</em></p>
`;

export default async function TermsPage() {
  const settings = await getSettings();
  const html = settings.legal.terms || FALLBACK_TERMS;

  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Terms of Service"
        description={`Last updated ${formatDate(new Date(), 'long')}.`}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Terms of Service' }]}
        size="sm"
      />
      <Section size="prose">
        <RichText html={html} />
      </Section>
    </>
  );
}
