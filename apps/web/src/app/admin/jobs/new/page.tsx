'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { jobUpsertSchema, type Job, type JobUpsertInput } from '@kmg/shared';

import { JobForm } from '@/app/admin/jobs/_components/job-form';
import { useZodForm } from '@/components/forms';
import { PageHeader } from '@/components/shared';
import { api, errorMessage } from '@/lib/api/client';
import { revalidatePublicSite } from '@/lib/revalidate';
import { RequireAuth } from '@/lib/auth/guards';

function NewJobContent() {
  const router = useRouter();
  const form = useZodForm(jobUpsertSchema, {
    defaultValues: {
      title: '',
      slug: '',
      departmentId: '',
      summary: '',
      description: '',
      skills: [],
      responsibilities: [],
      requirements: [],
      preferredSkills: [],
      benefits: [],
      hiringProcess: [],
      screeningQuestions: [],
      experienceMin: 0,
      employmentType: 'FULL_TIME',
      workMode: 'REMOTE',
      location: '',
      showSalary: false,
      openings: 1,
      status: 'DRAFT',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: JobUpsertInput) => api.postData<Job>('/admin/jobs', values),
    onSuccess: (job) => {
      toast.success('Job created');
      revalidatePublicSite('jobs', 'sitemap');
      router.push(`/admin/jobs/${job.id}`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="New job"
        breadcrumbs={[{ label: 'Jobs', href: '/admin/jobs' }, { label: 'New job' }]}
      />
      <JobForm form={form} onSubmit={(values) => mutation.mutate(values)} submitting={mutation.isPending} />
    </div>
  );
}

export default function NewJobPage() {
  return (
    <RequireAuth permission="jobs:write">
      <NewJobContent />
    </RequireAuth>
  );
}
