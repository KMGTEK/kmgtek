'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { toast } from 'sonner';

import { candidateProfileSchema, type CandidateProfile, type CandidateProfileInput } from '@kmg/shared';

import {
  applyApiErrorToForm,
  Form,
  SubmitButton,
  TextareaField,
  TextField,
  useZodForm,
} from '@/components/forms';
import { TagInputBase } from '@/components/forms/tag-input';
import { ErrorState } from '@/components/shared/error-state';
import { FileDropzone } from '@/components/shared/file-dropzone';
import { FormSkeleton } from '@/components/shared/loading-skeletons';
import { PageHeader } from '@/components/shared/page-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { useAuth } from '@/lib/auth/auth-provider';
import { initials } from '@/lib/utils';

const DEFAULT_VALUES: CandidateProfileInput = {
  name: '',
  phone: '',
  location: '',
  headline: '',
  summary: '',
  currentCompany: '',
  experienceYears: undefined,
  currentCtc: '',
  expectedCtc: '',
  noticePeriod: '',
  linkedinUrl: '',
  githubUrl: '',
  portfolioUrl: '',
};

function AvatarCard({ profile }: { profile: CandidateProfile }) {
  const { refresh } = useAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);

  async function upload() {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setUploading(true);
      await api.upload('/me/avatar', formData);
      await Promise.all([queryClient.invalidateQueries({ queryKey: qk.me.profile }), refresh()]);
      setFile(null);
      toast.success('Avatar updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update your avatar');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="gap-4 p-6">
      <h2 className="font-display text-base font-semibold">Profile photo</h2>
      <div className="flex items-center gap-4">
        <Avatar size="lg">
          <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.name} />
          <AvatarFallback className="bg-brand-500/15 text-brand-700 dark:text-brand-300 text-sm font-semibold">
            {initials(profile.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <FileDropzone purpose="AVATAR" value={file} onChange={setFile} disabled={uploading} />
        </div>
      </div>
      {file ? (
        <Button size="sm" className="w-fit" onClick={() => void upload()} disabled={uploading}>
          {uploading ? 'Uploading…' : 'Save photo'}
        </Button>
      ) : null}
    </Card>
  );
}

function SkillsCard({ profile }: { profile: CandidateProfile }) {
  const queryClient = useQueryClient();
  const [skills, setSkills] = React.useState<string[]>(profile.skills.map((skill) => skill.name));
  const initial = React.useRef(profile.skills);

  const mutation = useMutation({
    mutationFn: (names: string[]) =>
      api.put('/me/skills', {
        skills: names.map((name) => {
          const existing = initial.current.find((skill) => skill.name.toLowerCase() === name.toLowerCase());
          return existing ? { name, level: existing.level ?? undefined, years: existing.years ?? undefined } : { name };
        }),
      }),
    onSuccess: () => {
      toast.success('Skills updated');
      void queryClient.invalidateQueries({ queryKey: qk.me.profile });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not update skills'),
  });

  return (
    <Card className="gap-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Skills</h2>
        <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate(skills)}>
          {mutation.isPending ? 'Saving…' : 'Save skills'}
        </Button>
      </div>
      <TagInputBase
        value={skills}
        onChange={setSkills}
        placeholder="Add a skill and press Enter…"
        max={50}
      />
    </Card>
  );
}

export function ProfileClient() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: qk.me.profile,
    queryFn: () => api.getData<CandidateProfile>('/me/profile'),
  });

  const form = useZodForm(candidateProfileSchema, { defaultValues: DEFAULT_VALUES });
  const prefilled = React.useRef(false);

  React.useEffect(() => {
    if (!profile || prefilled.current) return;
    prefilled.current = true;
    form.reset({
      name: profile.name,
      phone: profile.phone ?? '',
      location: profile.location ?? '',
      headline: profile.headline ?? '',
      summary: profile.summary ?? '',
      currentCompany: profile.currentCompany ?? '',
      experienceYears: profile.experienceYears ?? undefined,
      currentCtc: profile.currentCtc ?? '',
      expectedCtc: profile.expectedCtc ?? '',
      noticePeriod: profile.noticePeriod ?? '',
      linkedinUrl: profile.linkedinUrl ?? '',
      githubUrl: profile.githubUrl ?? '',
      portfolioUrl: profile.portfolioUrl ?? '',
    });
  }, [profile, form]);

  async function onSubmit(values: CandidateProfileInput) {
    try {
      await api.patch('/me/profile', values);
      toast.success('Profile updated');
      void queryClient.invalidateQueries({ queryKey: qk.me.profile });
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Profile" />
        <FormSkeleton fields={6} />
      </div>
    );
  }

  if (error || !profile) {
    return <ErrorState error={error} onAction={() => refetch()} />;
  }

  return (
    <div className="space-y-8">
      <PageHeader title="My Profile" description="Keep your details current so recruiters see the best version of you." />

      <AvatarCard profile={profile} />

      <Card className="gap-5 p-6">
        <h2 className="font-display text-base font-semibold">Basic information</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="name" label="Full name" required />
              <TextField name="phone" label="Phone" type="tel" />
              <TextField name="location" label="Location" placeholder="City, Country" />
              <TextField name="headline" label="Headline" placeholder="Senior DevOps Engineer" />
              <TextField name="currentCompany" label="Current company" />
              <TextField name="experienceYears" label="Years of experience" type="number" inputMode="decimal" />
              <TextField name="currentCtc" label="Current CTC" />
              <TextField name="expectedCtc" label="Expected CTC" />
              <TextField name="noticePeriod" label="Notice period" />
            </div>
            <TextareaField name="summary" label="Summary" rows={4} maxLength={3000} />
            <div className="grid gap-5 sm:grid-cols-3">
              <TextField name="linkedinUrl" label="LinkedIn" />
              <TextField name="githubUrl" label="GitHub" />
              <TextField name="portfolioUrl" label="Portfolio" />
            </div>
            <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
          </form>
        </Form>
      </Card>

      <SkillsCard profile={profile} />
    </div>
  );
}
