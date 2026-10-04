'use client';

import { useQuery } from '@tanstack/react-query';
import { GripVerticalIcon, PlusIcon, XIcon } from 'lucide-react';
import { useFieldArray, useFormContext, type UseFormReturn } from 'react-hook-form';

import {
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  JOB_STATUSES,
  WORK_MODES,
  WORK_MODE_LABELS,
  type Job,
  type JobCategory,
  type JobUpsertInput,
} from '@kmg/shared';

import { useAssignableUsers } from '@/components/admin/assignable-users';
import {
  CheckboxField,
  Form,
  ListInput,
  RichTextEditor,
  SelectField,
  SubmitButton,
  TagInput,
  TextField,
  TextareaField,
  type SelectOption,
} from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  CLOSED: 'Closed',
  ARCHIVED: 'Archived',
};

function useDepartmentOptions() {
  const { data } = useQuery({
    queryKey: qk.admin.departments,
    queryFn: () => api.getData<JobCategory[]>('/admin/job-categories'),
  });
  return (data ?? []).map((department) => ({ label: department.name, value: department.id }));
}

function toDateInputValue(value: unknown): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function HiringProcessSection() {
  const form = useFormContext<JobUpsertInput>();
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'hiringProcess' });

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <div key={field.id} className="flex items-start gap-2 rounded-lg border p-3">
          <GripVerticalIcon className="text-muted-foreground mt-2.5 size-4 shrink-0" aria-hidden />
          <div className="flex-1 space-y-2">
            <TextField name={`hiringProcess.${index}.title`} placeholder="Step title (e.g. Technical interview)" />
            <TextareaField name={`hiringProcess.${index}.description`} placeholder="What happens in this step" rows={2} />
          </div>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove step" onClick={() => remove(index)}>
            <XIcon className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => append({ title: '', description: '' })}>
        <PlusIcon className="size-4" />
        Add step
      </Button>
    </div>
  );
}

function ScreeningQuestionsSection() {
  const form = useFormContext<JobUpsertInput>();
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'screeningQuestions' });

  const typeOptions: SelectOption[] = [
    { label: 'Short text', value: 'text' },
    { label: 'Long text', value: 'textarea' },
    { label: 'Yes / No', value: 'yesno' },
    { label: 'Number', value: 'number' },
  ];

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <div key={field.id} className="flex items-start gap-2 rounded-lg border p-3">
          <div className="flex-1 space-y-2">
            <TextField name={`screeningQuestions.${index}.question`} placeholder="Question" />
            <div className="flex flex-wrap items-center gap-3">
              <SelectField
                name={`screeningQuestions.${index}.type`}
                options={typeOptions}
                placeholder="Answer type"
                className="w-48"
              />
              <CheckboxField name={`screeningQuestions.${index}.required`} label="Required" className="pt-1" />
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove question" onClick={() => remove(index)}>
            <XIcon className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          append({
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `q-${Date.now()}`,
            question: '',
            type: 'text',
            required: false,
          })
        }
      >
        <PlusIcon className="size-4" />
        Add question
      </Button>
    </div>
  );
}

export interface JobFormProps {
  form: UseFormReturn<JobUpsertInput>;
  job?: Job;
  onSubmit: (values: JobUpsertInput, action: 'draft' | 'publish' | 'save') => void;
  submitting?: boolean;
}

export function JobForm({ form, job, onSubmit, submitting }: JobFormProps) {
  const departmentOptions = useDepartmentOptions();
  const { data: managers, isLoading: managersLoading } = useAssignableUsers('jobs:read');

  const managerOptions: SelectOption[] = (managers ?? []).map((user) => ({ label: `${user.name} (${user.email})`, value: user.id }));

  const submitAs = (action: 'draft' | 'publish' | 'save') => {
    if (action === 'draft') form.setValue('status', 'DRAFT');
    if (action === 'publish') form.setValue('status', 'PUBLISHED');
    void form.handleSubmit((values) => onSubmit(values, action))();
  };

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="title" label="Job title" required placeholder="Senior Backend Engineer" />
              <TextField name="slug" label="Slug" placeholder="auto-generated if left blank" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField name="departmentId" label="Department" options={departmentOptions} placeholder="Select department" />
              <TextField name="location" label="Location" required placeholder="Remote / New York, NY" />
            </div>
            <TextareaField name="summary" label="Summary" required rows={3} placeholder="One or two sentences for job cards & SEO" maxLength={500} />
            <RichTextEditor name="description" label="Full description" placeholder="Role overview, day-to-day, team context…" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Skills &amp; requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TagInput name="skills" label="Skills" placeholder="Type a skill and press Enter" />
            <TagInput name="preferredSkills" label="Preferred skills" placeholder="Nice-to-have skills" />
            <ListInput name="responsibilities" label="Responsibilities" placeholder="Add a responsibility" addLabel="Add responsibility" />
            <ListInput name="requirements" label="Requirements" placeholder="Add a requirement" addLabel="Add requirement" />
            <ListInput name="benefits" label="Benefits" placeholder="Add a benefit" addLabel="Add benefit" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Hiring process</CardTitle>
          </CardHeader>
          <CardContent>
            <HiringProcessSection />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Screening questions</CardTitle>
          </CardHeader>
          <CardContent>
            <ScreeningQuestionsSection />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Employment details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TextField name="experienceMin" label="Min experience (yrs)" type="number" />
              <TextField name="experienceMax" label="Max experience (yrs)" type="number" />
              <SelectField
                name="employmentType"
                label="Employment type"
                required
                options={EMPLOYMENT_TYPES.map((type) => ({ label: EMPLOYMENT_TYPE_LABELS[type], value: type }))}
              />
              <SelectField
                name="workMode"
                label="Work mode"
                required
                options={WORK_MODES.map((mode) => ({ label: WORK_MODE_LABELS[mode], value: mode }))}
              />
            </div>
            <TextField name="openings" label="Openings" type="number" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Compensation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TextField name="salaryMin" label="Salary min" type="number" />
              <TextField name="salaryMax" label="Salary max" type="number" />
              <TextField name="salaryCurrency" label="Currency" placeholder="USD" />
              <SelectField
                name="salaryPeriod"
                label="Period"
                options={[
                  { label: 'Per year', value: 'YEAR' },
                  { label: 'Per month', value: 'MONTH' },
                  { label: 'Per hour', value: 'HOUR' },
                ]}
              />
            </div>
            <CheckboxField name="showSalary" label="Show salary on the public job listing" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Ownership &amp; publishing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                name="hiringManagerId"
                label="Hiring manager"
                options={managerOptions}
                placeholder={managersLoading ? 'Loading…' : 'Select hiring manager'}
              />
              <SelectField
                name="status"
                label="Status"
                required
                options={JOB_STATUSES.map((status) => ({ label: STATUS_LABELS[status], value: status }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Published at</label>
                <Input
                  type="date"
                  defaultValue={toDateInputValue(job?.publishedAt)}
                  onChange={(event) => form.setValue('publishedAt', event.target.value as never)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Closing date</label>
                <Input
                  type="date"
                  defaultValue={toDateInputValue(job?.closingDate)}
                  onChange={(event) => form.setValue('closingDate', event.target.value as never)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">SEO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TextField name="seoTitle" label="SEO title" />
            <TextareaField name="seoDescription" label="SEO description" rows={2} maxLength={170} />
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" disabled={submitting} onClick={() => submitAs('draft')}>
            Save as draft
          </Button>
          <SubmitButton disabled={submitting} onClick={() => submitAs('publish')}>
            Publish
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
}
