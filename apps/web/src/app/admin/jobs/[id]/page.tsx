'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { jobUpsertSchema, type Job, type JobUpsertInput } from '@kmg/shared';

import { JobForm } from '@/app/admin/jobs/_components/job-form';
import { useZodForm } from '@/components/forms';
import { DetailSkeleton, ErrorState, PageHeader } from '@/components/shared';
import { api, errorMessage } from '@/lib/api/client';
import { revalidatePublicSite } from '@/lib/revalidate';
import { qk } from '@/lib/api/query-keys';
import { RequireAuth } from '@/lib/auth/guards';

function useJob(id: string) {
  return useQuery({
    queryKey: qk.admin.jobs.detail(id),
    queryFn: () => api.getData<Job>(`/admin/jobs/${id}`),
    enabled: Boolean(id),
  });
}

function toFormValues(job: Job): JobUpsertInput {
  return {
    title: job.title,
    slug: job.slug,
    departmentId: job.department?.id ?? '',
    summary: job.summary,
    description: job.description,
    skills: job.skills,
    responsibilities: job.responsibilities,
    requirements: job.requirements,
    preferredSkills: job.preferredSkills,
    benefits: job.benefits,
    hiringProcess: job.hiringProcess,
    screeningQuestions: job.screeningQuestions,
    experienceMin: job.experienceMin,
    experienceMax: job.experienceMax ?? undefined,
    employmentType: job.employmentType,
    workMode: job.workMode,
    location: job.location,
    salaryMin: job.salaryMin ?? undefined,
    salaryMax: job.salaryMax ?? undefined,
    salaryCurrency: job.salaryCurrency ?? undefined,
    salaryPeriod: job.salaryPeriod ?? undefined,
    showSalary: job.showSalary,
    openings: job.openings,
    hiringManagerId: job.hiringManager?.id ?? '',
    status: job.status,
    publishedAt: job.publishedAt ?? undefined,
    closingDate: job.closingDate ?? undefined,
    seoTitle: job.seoTitle ?? undefined,
    seoDescription: job.seoDescription ?? undefined,
  };
}

function EditJobContent({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: job, isLoading, error, refetch } = useJob(id);

  const form = useZodForm(jobUpsertSchema, { defaultValues: job ? toFormValues(job) : undefined });

  React.useEffect(() => {
    if (job) form.reset(toFormValues(job));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);

  const mutation = useMutation({
    mutationFn: (values: JobUpsertInput) => api.patchData<Job>(`/admin/jobs/${id}`, values),
    onSuccess: (updated) => {
      toast.success('Job saved');
      queryClient.invalidateQueries({ queryKey: qk.admin.jobs.all });
      revalidatePublicSite('jobs', 'sitemap');
      form.reset(toFormValues(updated));
    },
    onError: (mutationError) => toast.error(errorMessage(mutationError)),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-6">
        <PageHeader title="Loading job…" />
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !job) {
    return (
      <ErrorState
        error={error}
        title="Job not found"
        actionLabel="Back to jobs"
        onAction={() => router.push('/admin/jobs')}
      />
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={job.title}
        breadcrumbs={[{ label: 'Jobs', href: '/admin/jobs' }, { label: job.title }]}
      />
      <JobForm form={form} job={job} onSubmit={(values) => mutation.mutate(values)} submitting={mutation.isPending} />
    </div>
  );
}

export default function EditJobPage() {
  const params = useParams<{ id: string }>();
  return (
    <RequireAuth permission="jobs:write">
      <EditJobContent id={params.id} />
    </RequireAuth>
  );
}
