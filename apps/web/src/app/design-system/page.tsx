import { AlertTriangleIcon, ArrowRightIcon, InfoIcon, RocketIcon, SparklesIcon } from 'lucide-react';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Reveal } from '@/components/motion/reveal';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { AnimatedCounter } from '@/components/motion/animated-counter';
import { DynamicIcon } from '@/components/shared/dynamic-icon';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import {
  CardGridSkeleton,
  ListSkeleton,
  StatsSkeleton,
  TableSkeleton,
} from '@/components/shared/loading-skeletons';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { SuccessState } from '@/components/shared/success-state';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export const metadata: Metadata = {
  title: 'Design System',
  description: 'Internal component and style reference — not part of the public site.',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

const COLOR_SWATCHES: { name: string; classes: string; note?: string }[] = [
  { name: 'brand-50', classes: 'bg-brand-50' },
  { name: 'brand-300', classes: 'bg-brand-300' },
  { name: 'brand-500', classes: 'bg-brand-500', note: 'logo orange · primary' },
  { name: 'brand-700', classes: 'bg-brand-700', note: 'AA text on white' },
  { name: 'brand-900', classes: 'bg-brand-900' },
  { name: 'ember-50', classes: 'bg-ember-50' },
  { name: 'ember-300', classes: 'bg-ember-300' },
  { name: 'ember-500', classes: 'bg-ember-500', note: 'accent red · destructive/urgent' },
  { name: 'ember-700', classes: 'bg-ember-700' },
  { name: 'ember-900', classes: 'bg-ember-900' },
  { name: 'ink-50', classes: 'bg-ink-50 ring-1 ring-inset ring-ink-200' },
  { name: 'ink-300', classes: 'bg-ink-300' },
  { name: 'ink-500', classes: 'bg-ink-500' },
  { name: 'ink-700', classes: 'bg-ink-700' },
  { name: 'ink-950', classes: 'bg-ink-950', note: 'logo black' },
];

function Swatch({ name, classes, note }: { name: string; classes: string; note?: string }) {
  return (
    <div className="space-y-1.5">
      <div className={`h-16 w-full rounded-lg ${classes}`} />
      <p className="font-mono text-xs font-medium">{name}</p>
      {note ? <p className="text-muted-foreground text-xs">{note}</p> : null}
    </div>
  );
}

function ShowcaseSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
        {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Internal component/style showcase. Never linked from the site, `noindex`, and
 * excluded from `disallow` in `robots.ts`. Renders in whichever theme the OS/toggle
 * picks — use the toggle in the header to check both.
 */
export default function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-16 px-6 py-10 pb-24">
      <div className="flex items-center justify-between">
        <PageHeader
          eyebrow="Internal · noindex"
          title="Design system"
          description="Every reusable ui/ and shared/ primitive, for reference while building the marketing site, portal and admin portal."
        />
        <ThemeToggle />
      </div>

      <ShowcaseSection title="Color tokens" description="src/app/globals.css — brand (orange), ember (red), ink (neutral). Use brand for primary actions/highlights, ember for destructive/urgent states only.">
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
          {COLOR_SWATCHES.map((swatch) => (
            <Swatch key={swatch.name} {...swatch} />
          ))}
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Typography" description="font-sans (Inter) for body text, font-display (Plus Jakarta Sans) for headings, font-mono (JetBrains Mono) for code.">
        <div className="space-y-3">
          <p className="font-display text-4xl font-semibold tracking-tight">Heading / 4xl display</p>
          <p className="font-display text-2xl font-semibold tracking-tight">Heading / 2xl display</p>
          <p className="font-display text-lg font-semibold">Heading / lg display</p>
          <p className="text-base">Body text in the sans font — used for paragraphs, descriptions and labels.</p>
          <p className="text-muted-foreground text-sm">Muted / small — secondary copy, hints, timestamps.</p>
          <p className="font-mono text-sm">font-mono — code, IDs, reference numbers.</p>
          <p className="gradient-text font-display text-2xl font-semibold">.gradient-text (brand → ember)</p>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Buttons" description="components/ui/button.tsx — variant × size.">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Default</Button>
          <Button variant="gradient">
            Gradient <ArrowRightIcon className="size-4" />
          </Button>
          <Button variant="soft">Soft</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="xl">Extra large</Button>
          <Button size="icon" aria-label="Rocket">
            <RocketIcon />
          </Button>
          <Button disabled>Disabled</Button>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Badges & status" description="components/ui/badge.tsx and components/shared/status-badge.tsx.">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="job" status="PUBLISHED" />
          <StatusBadge kind="application" status="UNDER_REVIEW" />
          <StatusBadge kind="lead" status="WON" />
          <StatusBadge kind="interview" status="NO_SHOW" />
          <StatusBadge kind="decision" status="STRONG_HIRE" />
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Cards & stats">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Cloud migration</CardTitle>
              <CardDescription>Lift-and-shift, replatform or refactor — assessed in two weeks.</CardDescription>
            </CardHeader>
            <CardContent>
              <DynamicIcon name="Cloud" className="text-brand-600 size-6" />
            </CardContent>
          </Card>
          <StatCard label="Open roles" value={42} icon="Briefcase" delta={12} tone="brand" />
          <StatCard label="Overdue reviews" value={3} icon="AlertTriangle" delta={-5} tone="ember" />
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Alerts">
        <div className="grid gap-3 sm:grid-cols-2">
          <Alert>
            <InfoIcon />
            <AlertTitle>Heads up</AlertTitle>
            <AlertDescription>Default alert — informational, neutral surface.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>Something needs attention</AlertTitle>
            <AlertDescription>Destructive alert — use ember sparingly, for real failures.</AlertDescription>
          </Alert>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Avatars">
        <div className="flex items-center gap-6">
          <Avatar>
            <AvatarFallback>KM</AvatarFallback>
          </Avatar>
          <AvatarGroup>
            <Avatar>
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>CD</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>EF</AvatarFallback>
            </Avatar>
            <AvatarGroupCount>+4</AvatarGroupCount>
          </AvatarGroup>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Form fields" description="components/ui/* primitives — form.tsx + forms/fields.tsx wrap these with react-hook-form.">
        <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ds-input">Work email</Label>
            <Input id="ds-input" placeholder="jane@company.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-select">Employment type</Label>
            <Select>
              <SelectTrigger id="ds-select" className="w-full">
                <SelectValue placeholder="Select one" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full-time">Full-time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ds-textarea">Message</Label>
            <Textarea id="ds-textarea" placeholder="Tell us about the role…" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="ds-checkbox" />
            <Label htmlFor="ds-checkbox">Subscribe to updates</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="ds-switch" />
            <Label htmlFor="ds-switch">Enable notifications</Label>
          </div>
          <RadioGroup defaultValue="remote" className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="remote" id="ds-remote" />
              <Label htmlFor="ds-remote">Remote</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="onsite" id="ds-onsite" />
              <Label htmlFor="ds-onsite">On-site</Label>
            </div>
          </RadioGroup>
          <Progress value={64} className="sm:col-span-2" />
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Tabs">
        <Tabs defaultValue="overview" className="max-w-md">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="text-muted-foreground text-sm">
            Overview panel content.
          </TabsContent>
          <TabsContent value="details" className="text-muted-foreground text-sm">
            Details panel content.
          </TabsContent>
        </Tabs>
      </ShowcaseSection>

      <ShowcaseSection title="Empty / error / success states" description="components/shared/{empty-state,error-state,success-state}.tsx">
        <div className="grid gap-4 sm:grid-cols-3">
          <EmptyState title="No applications yet" description="Jobs you apply to will show up here." icon={<SparklesIcon className="size-5" />} />
          <ErrorState title="Couldn't load data" description="The request failed. This is a static preview — no retry wired up." />
          <SuccessState title="Application submitted" description="We'll email you when there's an update." />
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Loading skeletons" description="components/shared/loading-skeletons.tsx — shown while server data streams in.">
        <Separator />
        <p className="text-muted-foreground text-sm">StatsSkeleton</p>
        <StatsSkeleton count={3} />
        <Separator />
        <p className="text-muted-foreground text-sm">CardGridSkeleton</p>
        <CardGridSkeleton count={3} />
        <Separator />
        <p className="text-muted-foreground text-sm">ListSkeleton</p>
        <ListSkeleton count={3} />
        <Separator />
        <p className="text-muted-foreground text-sm">TableSkeleton</p>
        <TableSkeleton rows={3} columns={4} />
      </ShowcaseSection>

      <ShowcaseSection title="Motion" description="components/motion/* — Reveal, Stagger, AnimatedCounter.">
        <Reveal>
          <p className="text-sm">This paragraph fades/slides in on mount (Reveal).</p>
        </Reveal>
        <Stagger className="grid grid-cols-3 gap-3">
          {['One', 'Two', 'Three'].map((label) => (
            <StaggerItem key={label}>
              <div className="bg-muted rounded-lg border p-4 text-center text-sm">{label}</div>
            </StaggerItem>
          ))}
        </Stagger>
        <p className="font-display gradient-text text-3xl font-semibold">
          <AnimatedCounter value={2500} suffix="+" />
        </p>
      </ShowcaseSection>

      <ShowcaseSection title="Icons" description="components/shared/dynamic-icon.tsx — lucide-react/dynamic, driven by a string name from data.">
        <div className="flex flex-wrap gap-4">
          {['Cloud', 'ShieldCheck', 'Rocket', 'Briefcase', 'Sparkles', 'ChartLine'].map((name) => (
            <div key={name} className="flex flex-col items-center gap-1.5 text-center">
              <span className="bg-brand-50 text-brand-700 dark:bg-brand-500/12 dark:text-brand-300 grid size-10 place-items-center rounded-lg">
                <DynamicIcon name={name} className="size-5" />
              </span>
              <span className="text-muted-foreground text-[11px]">{name}</span>
            </div>
          ))}
        </div>
      </ShowcaseSection>
    </div>
  );
}
