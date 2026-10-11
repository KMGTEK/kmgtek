'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { serviceUpsertSchema, type Service, type ServiceUpsertInput, type TechnologyCategory } from '@kmg/shared';

/**
 * The shared `Service` type omits `published` (the public GET only ever returns published
 * services), but the admin upsert schema and admin list need it. Tolerate its absence.
 */
export type AdminService = Service & { published?: boolean };

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  RichTextEditor,
  SubmitButton,
  SwitchField,
  TextField,
  TextareaField,
  applyApiErrorToForm,
  useZodForm,
} from '@/components/forms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { revalidatePublicSite } from '@/lib/revalidate';

import { TechMultiSelect } from '../../technologies/_components/tech-multi-select';
import { IconPicker } from './icon-picker';
import { BenefitsField, FaqsField, ProcessField } from './structured-list-fields';

export interface ServiceFormProps {
  serviceId?: string;
  initialData?: AdminService;
}

export function ServiceForm({ serviceId, initialData }: ServiceFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: techCategories } = useQuery({
    queryKey: qk.admin.technologyCategories,
    queryFn: () => api.getData<TechnologyCategory[]>('/admin/technology-categories'),
  });
  const technologyOptions = React.useMemo(
    () => (techCategories ?? []).flatMap((category) => category.technologies.map((tech) => ({ id: tech.id, label: tech.name }))),
    [techCategories],
  );

  const form = useZodForm(serviceUpsertSchema, {
    defaultValues: {
      title: initialData?.title ?? '',
      slug: initialData?.slug ?? '',
      shortDescription: initialData?.shortDescription ?? '',
      overview: initialData?.overview ?? '',
      icon: initialData?.icon ?? 'Cloud',
      benefits: initialData?.benefits ?? [],
      process: initialData?.process ?? [],
      faqs: initialData?.faqs ?? [],
      technologyIds: initialData?.technologies?.map((tech) => tech.id) ?? [],
      order: initialData?.order ?? 0,
      published: initialData?.published ?? true,
      seoTitle: initialData?.seoTitle ?? '',
      seoDescription: initialData?.seoDescription ?? '',
    },
  });

  async function onSubmit(values: ServiceUpsertInput) {
    try {
      if (serviceId) {
        await api.patch(`/admin/services/${serviceId}`, values);
        toast.success('Service updated');
        queryClient.invalidateQueries({ queryKey: qk.admin.service(serviceId) });
      } else {
        const created = await api.postData<Service>('/admin/services', values);
        toast.success('Service created');
        router.push(`/admin/services/${created.id}`);
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
      revalidatePublicSite('services');
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <TextField name="title" label="Title" required />
              <TextField name="slug" label="Slug" placeholder="auto-generated if left blank" />
              <TextareaField name="shortDescription" label="Short description" required rows={2} maxLength={300} />
              <RichTextEditor name="overview" label="Overview" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Benefits</CardTitle></CardHeader>
            <CardContent><BenefitsField name="benefits" /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Process</CardTitle></CardHeader>
            <CardContent><ProcessField name="process" /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent><FaqsField name="faqs" /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>SEO</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <TextField name="seoTitle" label="SEO title" />
              <TextareaField name="seoDescription" label="SEO description" rows={2} maxLength={170} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Publish</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <SwitchField name="published" label="Published" description="Visible in the services menu and index." />
              <TextField name="order" label="Display order" type="number" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Icon</CardTitle></CardHeader>
            <CardContent><IconPicker name="icon" description="Shown on service cards and the mega-menu." /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Technologies</CardTitle></CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="technologyIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Related technologies</FormLabel>
                    <FormControl>
                      <TechMultiSelect value={(field.value as string[]) ?? []} onChange={field.onChange} options={technologyOptions} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <SubmitButton className="w-full" pendingLabel="Saving…">
            {serviceId ? 'Save changes' : 'Create service'}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
}
