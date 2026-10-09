import { BadgeCheckIcon, BuildingIcon, CompassIcon, RocketIcon, UsersRoundIcon } from 'lucide-react';
import Image from 'next/image';
import type { Metadata } from 'next';

import { COMPANY } from '@kmg/shared';

import { Section } from '@/components/layout/section';
import { PageHero } from '@/components/layout/page-hero';
import { Reveal } from '@/components/motion/reveal';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { ContactCta } from '@/components/marketing';
import { DynamicIcon } from '@/components/shared/dynamic-icon';
import { EmptyState } from '@/components/shared/empty-state';
import { JsonLd } from '@/components/shared/json-ld';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getContentBlocks, getSettings, getTeamMembers } from '@/lib/api/public';
import { breadcrumbJsonLd, buildMetadata } from '@/lib/seo';
import { cn, initials } from '@/lib/utils';

export const metadata: Metadata = buildMetadata({
  title: 'About Us',
  description: `${COMPANY.description} Learn about our story, mission, leadership and the values that guide every engagement.`,
  path: '/about',
});

function buildTimeline() {
  const founded = COMPANY.foundedYear;
  const currentYear = new Date().getFullYear();
  const yearsActive = Math.max(1, currentYear - founded);

  // Milestone offsets scale to how long KMG has actually been operating, so the timeline
  // stays sensible however far `founded` is from today — no hardcoded years past `currentYear`.
  const milestones = [
    { year: founded, title: 'KMG Technologies founded', description: 'Started in Edison, New Jersey as a business analytics consultancy and technical talent practice.' },
    { year: Math.min(founded + 1, currentYear), title: 'Cloud & AI capabilities added', description: 'Expanded the analytics practice with cloud data platforms and applied AI to support it.' },
    { year: Math.min(founded + Math.round(yearsActive * 0.4), currentYear), title: '25th enterprise engagement', description: 'Crossed 25 completed client engagements across banking, healthcare and manufacturing.' },
    { year: Math.min(founded + Math.round(yearsActive * 0.7), currentYear), title: 'Platform & DevOps practice', description: 'Built out platform engineering, DevOps and SRE capabilities alongside the analytics core.' },
    { year: currentYear, title: 'Today', description: 'Serving clients across the United States with a senior, analytics-led delivery model.' },
  ];
  const deduped = milestones.filter((m, i, arr) => i === 0 || m.year > arr[i - 1].year);
  // Always keep the founding row and the "Today" row even if the middle ones collapsed.
  if (deduped[deduped.length - 1]?.title !== 'Today') deduped.push(milestones[milestones.length - 1]);
  return deduped;
}

export default async function AboutPage() {
  const [team, content, settings] = await Promise.all([getTeamMembers(true), getContentBlocks(), getSettings()]);
  const timeline = buildTimeline();
  const story = content['about.story'];
  const missionVision = content['about.mission_vision'];
  const values = content['about.values'];
  const certifications = content['about.certifications'];
  const globalPresence = content['about.global_presence'];

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', href: '/' },
          { name: 'About', href: '/about' },
        ])}
      />

      <PageHero
        eyebrow="About KMG Technologies"
        title="Connecting exceptional engineering with exceptional outcomes"
        description={COMPANY.description}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'About' }]}
      />

      {/* Story ------------------------------------------------------------- */}
      <Section eyebrow={story.eyebrow} title={story.title}>
        <Reveal>
          <div className="prose dark:prose-invert max-w-none text-base leading-relaxed">
            {story.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* Mission / Vision ---------------------------------------------------- */}
      <Section variant="muted">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <Card className="h-full gap-3 p-8">
              <RocketIcon className="text-primary-text dark:text-brand-300 size-7" aria-hidden />
              <h2 className="font-display text-2xl font-semibold tracking-tight">{missionVision.missionTitle}</h2>
              <p className="text-muted-foreground leading-relaxed">{missionVision.missionText}</p>
            </Card>
          </Reveal>
          <Reveal delay={0.08}>
            <Card className="h-full gap-3 p-8">
              <CompassIcon className="text-primary-text dark:text-brand-300 size-7" aria-hidden />
              <h2 className="font-display text-2xl font-semibold tracking-tight">{missionVision.visionTitle}</h2>
              <p className="text-muted-foreground leading-relaxed">{missionVision.visionText}</p>
            </Card>
          </Reveal>
        </div>
      </Section>

      {/* Values -------------------------------------------------------------- */}
      <Section eyebrow={values.eyebrow} title={values.title}>
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.values.map((value) => (
            <StaggerItem key={value.title}>
              <Card className="h-full gap-2.5 p-6">
                <DynamicIcon name={value.icon} className="text-primary-text dark:text-brand-300 size-6" aria-hidden />
                <h3 className="font-display mt-1 text-base font-semibold">{value.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{value.description}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* Leadership ------------------------------------------------------------ */}
      {settings.features.leadership ? (
        <Section variant="muted" eyebrow="Leadership" title="The team behind the roadmap">
          {team.length ? (
            <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {team.map((member) => (
                <StaggerItem key={member.id}>
                  <Card className="h-full gap-3 p-6 text-center">
                    {member.photoUrl ? (
                      <Image
                        src={member.photoUrl}
                        alt={member.name}
                        width={96}
                        height={96}
                        unoptimized
                        className="mx-auto size-24 rounded-full object-cover"
                      />
                    ) : (
                      <span className="bg-brand-50 text-brand-700 dark:bg-brand-500/12 dark:text-brand-300 mx-auto grid size-24 place-items-center rounded-full text-xl font-semibold">
                        {initials(member.name)}
                      </span>
                    )}
                    <div>
                      <h3 className="font-display text-base font-semibold">{member.name}</h3>
                      <p className="text-muted-foreground text-sm">{member.title}</p>
                    </div>
                    {member.bio ? (
                      <p className="text-muted-foreground line-clamp-3 text-xs leading-relaxed">{member.bio}</p>
                    ) : null}
                  </Card>
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <EmptyState
              icon={<UsersRoundIcon className="size-5" />}
              title="Leadership profiles coming soon"
              description="We're finalizing leadership bios — check back shortly."
            />
          )}
        </Section>
      ) : null}

      {/* Certifications ---------------------------------------------------------- */}
      {settings.features.certifications ? (
        <Section
          eyebrow={certifications.eyebrow}
          title={certifications.title}
          description="Illustrative badges representing the standards and partner programs we align our delivery to. Confirm current certification status with your account team."
        >
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {certifications.items.map((cert) => (
              <StaggerItem key={cert.name}>
                <Card className="h-full flex-row items-start gap-3 p-5">
                  <BadgeCheckIcon className="text-primary-text dark:text-brand-300 mt-0.5 size-6 shrink-0" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold">{cert.name}</p>
                    <p className="text-muted-foreground text-xs">{cert.description}</p>
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
          <p className="text-muted-foreground mt-4 text-xs">
            * Illustrative representation of the standards and partner tiers our practice targets — contact us for
            current, verifiable certification documentation.
          </p>
        </Section>
      ) : null}

      {/* Global presence -------------------------------------------------------- */}
      <Section variant="muted" eyebrow={globalPresence.eyebrow} title={globalPresence.title}>
        <Stagger className="grid gap-5 sm:grid-cols-3">
          {globalPresence.regions.map((region) => (
            <StaggerItem key={region.name}>
              <Card className="h-full gap-2 p-6">
                <BuildingIcon className="text-primary-text dark:text-brand-300 size-6" aria-hidden />
                <h3 className="font-display mt-1 text-base font-semibold">{region.name}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{region.detail}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* Timeline ---------------------------------------------------------------- */}
      <Section eyebrow="Our journey" title="Milestones since founding">
        <ol className="border-border relative space-y-10 border-l pl-8">
          {timeline.map((milestone, index) => (
            <Reveal key={`${milestone.year}-${milestone.title}`} delay={index * 0.05} as="li" className="relative">
              <span
                className={cn(
                  'absolute top-1 -left-[calc(2rem+1px)] grid size-6 place-items-center rounded-full text-[10px] font-bold text-white',
                  index === timeline.length - 1 ? 'bg-ember-600' : 'bg-brand-600',
                )}
              >
                <span className="sr-only">Milestone</span>
              </span>
              <Badge variant="outline" className="mb-1.5">
                {milestone.year}
              </Badge>
              <h3 className="font-display text-lg font-semibold">{milestone.title}</h3>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{milestone.description}</p>
            </Reveal>
          ))}
        </ol>
      </Section>

      <ContactCta />
    </>
  );
}
