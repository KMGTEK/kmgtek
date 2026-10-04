import type { Metadata } from 'next';

import { COMPANY } from '@kmg/shared';

import { PageHero } from '@/components/layout/page-hero';
import { Section } from '@/components/layout/section';
import { RichText } from '@/components/shared/rich-text';
import { getSettings } from '@/lib/api/public';
import { buildMetadata } from '@/lib/seo';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy Policy',
  description: `How ${COMPANY.displayName} collects, uses and protects your information.`,
  path: '/privacy',
});

const FALLBACK_PRIVACY = `
  <p>${COMPANY.legalName} ("KMG Technologies", "we", "us") respects your privacy. This page describes, at a
  high level, how we collect and use information submitted through our website (contact forms, job
  applications and the candidate portal).</p>
  <h2>Information we collect</h2>
  <p>We collect information you provide directly — such as your name, email, phone number, resume and
  application details — as well as basic usage analytics to improve our website.</p>
  <h2>How we use it</h2>
  <p>We use this information to respond to inquiries, evaluate job applications, deliver requested services and
  improve our website. We do not sell personal information to third parties.</p>
  <h2>Contact us</h2>
  <p>For privacy questions or data requests, contact us at <a href="mailto:${COMPANY.email}">${COMPANY.email}</a>.</p>
  <p><em>This is placeholder copy pending the final policy from our legal team.</em></p>
`;

export default async function PrivacyPage() {
  const settings = await getSettings();
  const html = settings.legal.privacyPolicy || FALLBACK_PRIVACY;

  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        description={`Last updated ${formatDate(new Date(), 'long')}.`}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Privacy Policy' }]}
        size="sm"
      />
      <Section size="prose">
        <RichText html={html} />
      </Section>
    </>
  );
}
