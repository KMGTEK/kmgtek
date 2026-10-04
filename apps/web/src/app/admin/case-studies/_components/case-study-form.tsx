'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { caseStudyUpsertSchema, type CaseStudy, type CaseStudyUpsertInput, type TechnologyCategory } from '@kmg/shared';

import { FileDropzone } from '@/components/shared';
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
import { revalidatePublicSite } from '@/lib/revalidate';
import { qk } from '@/lib/api/query-keys';

import { TechMultiSelect } from '../../technologies/_components/tech-multi-select';
import { GalleryField } from './gallery-field';
import { MetricsField } from './metrics-field';

export interface CaseStudyFormProps {
  caseStudyId?: string;
  initialData?: CaseStudy;
}

export function CaseStudyForm({ caseStudyId, initialData }: CaseStudyFormProps) {
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

  const form = useZodForm(caseStudyUpsertSchema, {
    defaultValues: {
      title: initialData?.title ?? '',
      slug: initialData?.slug ?? '',
      clientName: initialData?.clientName ?? '',
      industry: initialData?.industry ?? '',
      summary: initialData?.summary ?? '',
      challenge: initialData?.challenge ?? '',
      solution: initialData?.solution ?? '',
      architecture: initialData?.architecture ?? '',
      results: initialData?.results ?? '',
      metrics: initialData?.metrics ?? [],
      coverImageUrl: initialData?.coverImageUrl ?? '',
      images: initialData?.images?.map((image) => ({ url: image.url, caption: image.caption ?? '' })) ?? [],
      technologyIds: initialData?.technologies?.map((tech) => tech.id) ?? [],
      featured: initialData?.featured ?? false,
      published: caseStudyId ? Boolean(initialData?.publishedAt) : true,
      seoTitle: initialData?.seoTitle ?? '',
      seoDescription: initialData?.seoDescription ?? '',
    },
  });

  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [coverProgress, setCoverProgress] = React.useState(0);

  async function uploadCover(): Promise<string | undefined> {
    if (!coverFile) return undefined;
    const formData = new FormData();
    formData.append('file', coverFile);
    formData.append('purpose', 'CASE_STUDY_IMAGE');
    const result = await api.upload<{ data: { url: string } }>('/admin/uploads', formData, { onProgress: setCoverProgress });
    return result.data.url;
  }

  async function onSubmit(values: CaseStudyUpsertInput) {
    try {
      const coverImageUrl = (await uploadCover()) ?? values.coverImageUrl;
      const payload = { ...values, coverImageUrl };
      if (caseStudyId) {
        await api.patch(`/admin/case-studies/${caseStudyId}`, payload);
        toast.success('Case study updated');
        queryClient.invalidateQueries({ queryKey: qk.admin.caseStudy(caseStudyId) });
      } else {
        const created = await api.postData<CaseStudy>('/admin/case-studies', payload);
        toast.success('Case study created');
        router.push(`/admin/case-studies/${created.id}`);
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'case-studies'] });
      revalidatePublicSite('case-studies', 'sitemap');
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
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField name="clientName" label="Client name" />
                <TextField name="industry" label="Industry" required />
              </div>
              <TextareaField name="summary" label="Summary" required rows={3} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Story</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <RichTextEditor name="challenge" label="Challenge" />
              <RichTextEditor name="solution" label="Solution" />
              <RichTextEditor name="architecture" label="Architecture (optional)" />
              <RichTextEditor name="results" label="Results" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Impact metrics</CardTitle></CardHeader>
            <CardContent>
              <MetricsField name="metrics" description="Shown as stat tiles on the case study page." />
            </CardContent>
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
              <SwitchField name="published" label="Published" description="Visible on the public site." />
              <SwitchField name="featured" label="Featured" description="Highlighted on the homepage and case studies index." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Technologies</CardTitle></CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="technologyIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Technologies used</FormLabel>
                    <FormControl>
                      <TechMultiSelect value={(field.value as string[]) ?? []} onChange={field.onChange} options={technologyOptions} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Cover image</CardTitle></CardHeader>
            <CardContent>
              <FileDropzone
                purpose="CASE_STUDY_IMAGE"
                value={coverFile}
                onChange={setCoverFile}
                progress={coverProgress}
                description={form.watch('coverImageUrl') ? `Current: ${form.watch('coverImageUrl')}` : undefined}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Gallery</CardTitle></CardHeader>
            <CardContent>
              <GalleryField name="images" description="Additional screenshots or diagrams, in display order." />
            </CardContent>
          </Card>

          <SubmitButton className="w-full" pendingLabel="Saving…">
            {caseStudyId ? 'Save changes' : 'Create case study'}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
}
