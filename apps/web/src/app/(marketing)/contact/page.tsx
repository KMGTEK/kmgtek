import { MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react';
import type { Metadata } from 'next';

import { COMPANY, type WebsiteSettings } from '@kmg/shared';

import { PageHero } from '@/components/layout/page-hero';
import { Section } from '@/components/layout/section';
import { Reveal } from '@/components/motion/reveal';
import { ContactForm } from '@/components/marketing';
import { JsonLd } from '@/components/shared/json-ld';
import { SocialIcon, type SocialKey } from '@/components/brand/social-icons';
import { Card } from '@/components/ui/card';
import { getContentBlock, getServices, getSettings } from '@/lib/api/public';
import { breadcrumbJsonLd, buildMetadata } from '@/lib/seo';
import { phoneToHref } from '@/lib/utils';

export const metadata: Metadata = buildMetadata({
  title: 'Contact',
  description: `Book a consultation with ${COMPANY.displayName}. Tell us about your cloud, DevOps or AI roadmap and we'll reply within one business day.`,
  path: '/contact',
});

const SOCIAL_KEYS: SocialKey[] = ['linkedin', 'twitter', 'github', 'facebook', 'youtube', 'instagram'];

function socialLinks(social: WebsiteSettings['social']) {
  return SOCIAL_KEYS.map((key) => ({ key, href: social[key] })).filter(
    (item): item is { key: SocialKey; href: string } => Boolean(item.href),
  );
}

export default async function ContactPage() {
  const [services, hero, settings] = await Promise.all([
    getServices(),
    getContentBlock('contact.hero'),
    getSettings(),
  ]);
  const social = socialLinks(settings.social);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', href: '/' },
          { name: 'Contact', href: '/contact' },
        ])}
      />

      <PageHero
        eyebrow={hero.eyebrow}
        title={hero.title}
        description={hero.description}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Contact' }]}
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Reveal>
            <Card className="p-6 sm:p-8">
              <ContactForm services={services} />
            </Card>
          </Reveal>

          <div className="space-y-6">
            <Card className="gap-4 p-6">
              <h3 className="font-display text-base font-semibold">Our office</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2.5">
                  <MapPinIcon className="text-primary-text dark:text-brand-300 mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>{settings.company.address}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <PhoneIcon className="text-primary-text dark:text-brand-300 size-4 shrink-0" aria-hidden />
                  <a href={phoneToHref(settings.company.phone)} className="hover:underline">
                    {settings.company.phone}
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <MailIcon className="text-primary-text dark:text-brand-300 size-4 shrink-0" aria-hidden />
                  <a href={`mailto:${settings.company.email}`} className="hover:underline">
                    {settings.company.email}
                  </a>
                </li>
              </ul>
              {social.length ? (
                <div className="flex items-center gap-2 pt-1">
                  {social.map((item) => (
                    <a
                      key={item.key}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.key}
                      className="hover:border-brand-400 hover:text-primary-text dark:hover:text-brand-300 grid size-9 place-items-center rounded-lg border transition-colors"
                    >
                      <SocialIcon name={item.key} />
                    </a>
                  ))}
                </div>
              ) : null}
            </Card>

            <Card className="overflow-hidden p-0">
              <iframe
                src={settings.company.mapEmbedUrl}
                title="Office location map"
                width="100%"
                height="260"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block border-0"
              />
            </Card>
          </div>
        </div>
      </Section>
    </>
  );
}
