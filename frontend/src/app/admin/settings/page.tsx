'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { optionalString, optionalUrl, type WebsiteSettings } from '@kmg/shared';

import { FileDropzone } from '@/components/shared';
import { DetailSkeleton, ErrorState, PageHeader } from '@/components/shared';
import {
  Form,
  RichTextEditor,
  SubmitButton,
  TagInput,
  TextField,
  TextareaField,
  applyApiErrorToForm,
  useZodForm,
} from '@/components/forms';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { RequireAuth, useCan } from '@/lib/auth';
import { revalidatePublicSite } from '@/lib/revalidate';

/**
 * The shared package only exports `settingsGroupSchema` (the group *names*) — there is no
 * per-group value schema. These mirror the `WebsiteSettings` shape in `@kmg/shared` types.ts
 * and are used purely for client-side validation; the API is the source of truth.
 */
const companySchema = z.object({
  name: z.string().trim().min(1).max(160),
  tagline: z.string().trim().max(200),
  description: z.string().trim().max(2000),
  email: z.email(),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(400),
  mapEmbedUrl: optionalString(1000),
});
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Enter a hex color like #F39C2C');
const brandingSchema = z.object({
  logoUrl: optionalString(500),
  faviconUrl: optionalString(500),
  primaryColor: hexColor,
  accentColor: hexColor,
});
const socialSchema = z.object({
  linkedin: optionalUrl,
  twitter: optionalUrl,
  github: optionalUrl,
  facebook: optionalUrl,
  youtube: optionalUrl,
  instagram: optionalUrl,
});
const seoSchema = z.object({
  defaultTitle: z.string().trim().max(70),
  titleTemplate: z.string().trim().max(80),
  defaultDescription: z.string().trim().max(170),
  keywords: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  ogImageUrl: optionalString(500),
  twitterHandle: optionalString(60),
});
const analyticsSchema = z.object({
  googleAnalyticsId: optionalString(40),
  googleTagManagerId: optionalString(40),
});
const footerSchema = z.object({
  about: z.string().trim().max(600),
  copyright: z.string().trim().max(200),
});
const legalSchema = z.object({
  privacyPolicy: z.string().max(200000).default(''),
  terms: z.string().max(200000).default(''),
});
const featuresSchema = z.object({
  companyIntro: z.boolean(),
  industries: z.boolean(),
  whyChooseUs: z.boolean(),
  toolchain: z.boolean(),
  testimonials: z.boolean(),
  stats: z.boolean(),
  jobsSection: z.boolean(),
  leadership: z.boolean(),
  certifications: z.boolean(),
});

const FEATURE_TOGGLES: { name: keyof z.infer<typeof featuresSchema>; label: string; description: string }[] = [
  { name: 'companyIntro', label: 'Company introduction', description: 'The "who we are" section under the hero.' },
  { name: 'industries', label: 'Industries we serve', description: 'The industries grid on the homepage.' },
  { name: 'whyChooseUs', label: 'Why choose us', description: 'The differentiators section on the homepage.' },
  { name: 'toolchain', label: 'Toolchain', description: 'The technologies-by-category preview on the homepage.' },
  { name: 'testimonials', label: 'Testimonials', description: 'The client testimonials section on the homepage.' },
  { name: 'stats', label: 'Statistics', description: 'The years-in-business / engagements counters.' },
  { name: 'jobsSection', label: 'Open positions', description: 'The latest-jobs preview on the homepage.' },
  { name: 'leadership', label: 'Leadership', description: 'The team/leadership section on the About page.' },
  { name: 'certifications', label: 'Certifications', description: 'The certifications & partnerships section on the About page.' },
];
const emailSchema = z.object({
  fromName: z.string().trim().min(1).max(160),
  fromAddress: z.email(),
  notifyAddresses: z.array(z.email()).max(20).default([]),
});

type SettingsGroupKey = keyof WebsiteSettings;

function useSaveGroup(group: SettingsGroupKey) {
  const queryClient = useQueryClient();
  return async (values: unknown) => {
    await api.put(`/admin/settings/${group}`, values);
    queryClient.invalidateQueries({ queryKey: qk.admin.settings });
    revalidatePublicSite('settings');
  };
}

function CompanyTab({ data }: { data: WebsiteSettings['company'] }) {
  const save = useSaveGroup('company');
  const canWrite = useCan('settings:write');
  const form = useZodForm(companySchema, { values: data });
  async function onSubmit(values: z.input<typeof companySchema>) {
    try {
      await save(values);
      toast.success('Company settings saved');
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader><CardTitle>Company</CardTitle><CardDescription>Shown in the footer, contact page and structured data.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <TextField name="name" label="Company name" required disabled={!canWrite} />
            <TextField name="tagline" label="Tagline" disabled={!canWrite} />
            <TextareaField name="description" label="Description" rows={3} disabled={!canWrite} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="email" label="Contact email" type="email" disabled={!canWrite} />
              <TextField name="phone" label="Phone" disabled={!canWrite} />
            </div>
            <TextareaField name="address" label="Address" rows={2} disabled={!canWrite} />
            <TextField name="mapEmbedUrl" label="Map embed URL" disabled={!canWrite} />
          </CardContent>
        </Card>
        {canWrite ? <SubmitButton pendingLabel="Saving…">Save company settings</SubmitButton> : null}
      </form>
    </Form>
  );
}

function BrandingTab({ data }: { data: WebsiteSettings['branding'] }) {
  const save = useSaveGroup('branding');
  const canWrite = useCan('settings:write');
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [faviconFile, setFaviconFile] = React.useState<File | null>(null);
  const form = useZodForm(brandingSchema, {
    values: { logoUrl: data.logoUrl ?? '', faviconUrl: data.faviconUrl ?? '', primaryColor: data.primaryColor, accentColor: data.accentColor },
  });

  async function uploadIfNeeded(file: File | null): Promise<string | undefined> {
    if (!file) return undefined;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', 'LOGO');
    const result = await api.upload<{ data: { url: string } }>('/admin/uploads', formData);
    return result.data.url;
  }

  async function onSubmit(values: z.input<typeof brandingSchema>) {
    try {
      const logoUrl = (await uploadIfNeeded(logoFile)) ?? values.logoUrl;
      const faviconUrl = (await uploadIfNeeded(faviconFile)) ?? values.faviconUrl;
      await save({ ...values, logoUrl, faviconUrl });
      toast.success('Branding saved');
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }

  const primaryColor = form.watch('primaryColor');
  const accentColor = form.watch('accentColor');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader><CardTitle>Branding</CardTitle><CardDescription>Logo, favicon and brand colors used across the site.</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <FileDropzone purpose="LOGO" value={logoFile} onChange={setLogoFile} label="Logo" disabled={!canWrite} description={data.logoUrl ? `Current: ${data.logoUrl}` : undefined} />
              <FileDropzone purpose="LOGO" value={faviconFile} onChange={setFaviconFile} label="Favicon" disabled={!canWrite} description={data.faviconUrl ? `Current: ${data.faviconUrl}` : undefined} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField control={form.control} name="primaryColor" render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <input type="color" value={field.value} disabled={!canWrite} onChange={field.onChange} className="size-9 rounded border" />
                      <Input value={field.value} disabled={!canWrite} onChange={field.onChange} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="accentColor" render={({ field }) => (
                <FormItem>
                  <FormLabel>Accent color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <input type="color" value={field.value} disabled={!canWrite} onChange={field.onChange} className="size-9 rounded border" />
                      <Input value={field.value} disabled={!canWrite} onChange={field.onChange} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="space-y-2">
              <Label>Live preview</Label>
              <div className="flex items-center gap-3 rounded-xl border p-4">
                <span className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: primaryColor }}>Primary</span>
                <span className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: accentColor }}>Accent</span>
                <span
                  className="h-10 flex-1 rounded-lg"
                  style={{ background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})` }}
                  aria-hidden
                />
              </div>
            </div>
          </CardContent>
        </Card>
        {canWrite ? <SubmitButton pendingLabel="Saving…">Save branding</SubmitButton> : null}
      </form>
    </Form>
  );
}

function SocialTab({ data }: { data: WebsiteSettings['social'] }) {
  const save = useSaveGroup('social');
  const canWrite = useCan('settings:write');
  const form = useZodForm(socialSchema, {
    values: { linkedin: data.linkedin ?? '', twitter: data.twitter ?? '', github: data.github ?? '', facebook: data.facebook ?? '', youtube: data.youtube ?? '', instagram: data.instagram ?? '' },
  });
  async function onSubmit(values: z.input<typeof socialSchema>) {
    try {
      await save(values);
      toast.success('Social links saved');
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader><CardTitle>Social links</CardTitle></CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <TextField name="linkedin" label="LinkedIn" disabled={!canWrite} />
            <TextField name="twitter" label="X / Twitter" disabled={!canWrite} />
            <TextField name="github" label="GitHub" disabled={!canWrite} />
            <TextField name="facebook" label="Facebook" disabled={!canWrite} />
            <TextField name="youtube" label="YouTube" disabled={!canWrite} />
            <TextField name="instagram" label="Instagram" disabled={!canWrite} />
          </CardContent>
        </Card>
        {canWrite ? <SubmitButton pendingLabel="Saving…">Save social links</SubmitButton> : null}
      </form>
    </Form>
  );
}

function SeoTab({ data }: { data: WebsiteSettings['seo'] }) {
  const save = useSaveGroup('seo');
  const canWrite = useCan('settings:write');
  const form = useZodForm(seoSchema, {
    values: { ...data, ogImageUrl: data.ogImageUrl ?? '', twitterHandle: data.twitterHandle ?? '' },
  });
  async function onSubmit(values: z.input<typeof seoSchema>) {
    try {
      await save(values);
      toast.success('SEO settings saved');
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader><CardTitle>SEO defaults</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <TextField name="defaultTitle" label="Default title" disabled={!canWrite} />
            <TextField name="titleTemplate" label="Title template" placeholder="%s | KMG Technologies" disabled={!canWrite} />
            <TextareaField name="defaultDescription" label="Default description" rows={2} maxLength={170} disabled={!canWrite} />
            <TagInput name="keywords" label="Keywords" placeholder="Type and press Enter…" />
            <TextField name="ogImageUrl" label="Default OG image URL" disabled={!canWrite} />
            <TextField name="twitterHandle" label="Twitter/X handle" placeholder="@kmgtek" disabled={!canWrite} />
          </CardContent>
        </Card>
        {canWrite ? <SubmitButton pendingLabel="Saving…">Save SEO settings</SubmitButton> : null}
      </form>
    </Form>
  );
}

function AnalyticsTab({ data }: { data: WebsiteSettings['analytics'] }) {
  const save = useSaveGroup('analytics');
  const canWrite = useCan('settings:write');
  const form = useZodForm(analyticsSchema, {
    values: { googleAnalyticsId: data.googleAnalyticsId ?? '', googleTagManagerId: data.googleTagManagerId ?? '' },
  });
  async function onSubmit(values: z.input<typeof analyticsSchema>) {
    try {
      await save(values);
      toast.success('Analytics settings saved');
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader><CardTitle>Analytics</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <TextField name="googleAnalyticsId" label="Google Analytics ID" placeholder="G-XXXXXXX" disabled={!canWrite} />
            <TextField name="googleTagManagerId" label="Google Tag Manager ID" placeholder="GTM-XXXXXXX" disabled={!canWrite} />
          </CardContent>
        </Card>
        {canWrite ? <SubmitButton pendingLabel="Saving…">Save analytics settings</SubmitButton> : null}
      </form>
    </Form>
  );
}

function FooterTab({ data }: { data: WebsiteSettings['footer'] }) {
  const save = useSaveGroup('footer');
  const canWrite = useCan('settings:write');
  const form = useZodForm(footerSchema, { values: data });
  async function onSubmit(values: z.input<typeof footerSchema>) {
    try {
      await save(values);
      toast.success('Footer settings saved');
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader><CardTitle>Footer</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <TextareaField name="about" label="About blurb" rows={3} disabled={!canWrite} />
            <TextField name="copyright" label="Copyright line" disabled={!canWrite} />
          </CardContent>
        </Card>
        {canWrite ? <SubmitButton pendingLabel="Saving…">Save footer settings</SubmitButton> : null}
      </form>
    </Form>
  );
}

function LegalTab({ data }: { data: WebsiteSettings['legal'] }) {
  const save = useSaveGroup('legal');
  const canWrite = useCan('settings:write');
  const form = useZodForm(legalSchema, { values: data });
  async function onSubmit(values: z.input<typeof legalSchema>) {
    try {
      await save(values);
      toast.success('Legal pages saved');
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader><CardTitle>Legal pages</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <RichTextEditor name="privacyPolicy" label="Privacy policy" />
            <RichTextEditor name="terms" label="Terms of service" />
          </CardContent>
        </Card>
        {canWrite ? <SubmitButton pendingLabel="Saving…">Save legal pages</SubmitButton> : null}
      </form>
    </Form>
  );
}

function FeaturesTab({ data }: { data: WebsiteSettings['features'] }) {
  const save = useSaveGroup('features');
  const canWrite = useCan('settings:write');
  const form = useZodForm(featuresSchema, { values: data });
  async function onSubmit(values: z.input<typeof featuresSchema>) {
    try {
      await save(values);
      toast.success('Feature toggles saved');
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Feature toggles</CardTitle>
            <CardDescription>
              Turn optional sections of the public site on or off without needing a developer. Only Super Admin can
              change these.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {FEATURE_TOGGLES.map((toggle) => (
              <FormField
                key={toggle.name}
                control={form.control}
                name={toggle.name}
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-xl border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>{toggle.label}</FormLabel>
                      <p className="text-muted-foreground text-sm">{toggle.description}</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canWrite} />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
          </CardContent>
        </Card>
        {canWrite ? <SubmitButton pendingLabel="Saving…">Save feature toggles</SubmitButton> : null}
      </form>
    </Form>
  );
}

function EmailTab({ data }: { data: NonNullable<WebsiteSettings['email']> }) {
  const save = useSaveGroup('email');
  const canWrite = useCan('settings:write');
  const form = useZodForm(emailSchema, { values: data });
  async function onSubmit(values: z.input<typeof emailSchema>) {
    try {
      await save(values);
      toast.success('Email settings saved');
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader><CardTitle>Outgoing email</CardTitle><CardDescription>Sender identity and internal notification recipients.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="fromName" label="From name" disabled={!canWrite} />
              <TextField name="fromAddress" label="From address" type="email" disabled={!canWrite} />
            </div>
            <TagInput name="notifyAddresses" label="Internal notification recipients" placeholder="Type an email and press Enter…" />
          </CardContent>
        </Card>
        {canWrite ? <SubmitButton pendingLabel="Saving…">Save email settings</SubmitButton> : null}
      </form>
    </Form>
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth permission="settings:read">
      <SettingsContent />
    </RequireAuth>
  );
}

function SettingsContent() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.admin.settings,
    queryFn: () => api.getData<WebsiteSettings>('/admin/settings'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Website Settings" description="Content shown across the public marketing site." />
      {isLoading ? (
        <DetailSkeleton />
      ) : error || !data ? (
        <ErrorState error={error} onAction={() => refetch()} />
      ) : (
        <Tabs defaultValue="company">
          <TabsList className="flex-wrap">
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="footer">Footer</TabsTrigger>
            <TabsTrigger value="legal">Legal</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>
          <TabsContent value="company" className="mt-6"><CompanyTab data={data.company} /></TabsContent>
          <TabsContent value="branding" className="mt-6"><BrandingTab data={data.branding} /></TabsContent>
          <TabsContent value="social" className="mt-6"><SocialTab data={data.social} /></TabsContent>
          <TabsContent value="seo" className="mt-6"><SeoTab data={data.seo} /></TabsContent>
          <TabsContent value="analytics" className="mt-6"><AnalyticsTab data={data.analytics} /></TabsContent>
          <TabsContent value="footer" className="mt-6"><FooterTab data={data.footer} /></TabsContent>
          <TabsContent value="legal" className="mt-6"><LegalTab data={data.legal} /></TabsContent>
          <TabsContent value="features" className="mt-6"><FeaturesTab data={data.features} /></TabsContent>
          <TabsContent value="email" className="mt-6">
            <EmailTab data={data.email ?? { fromName: '', fromAddress: '', notifyAddresses: [] }} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
