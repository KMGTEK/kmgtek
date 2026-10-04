'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon, StarIcon, Trash2Icon } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { testimonialUpsertSchema, type Paginated, type Testimonial, type TestimonialUpsertInput } from '@kmg/shared';

import { ConfirmDialog, EmptyState, ErrorState, FileDropzone, StatsSkeleton } from '@/components/shared';
import { PageHeader } from '@/components/shared';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  SubmitButton,
  SwitchField,
  TextField,
  TextareaField,
  applyApiErrorToForm,
  useZodForm,
} from '@/components/forms';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { api, errorMessage } from '@/lib/api/client';
import { revalidatePublicSite } from '@/lib/revalidate';
import { Can, RequireAuth } from '@/lib/auth';
import { cn, initials } from '@/lib/utils';

type AdminTestimonial = Testimonial & { published?: boolean };

export default function TestimonialsPage() {
  return (
    <RequireAuth permission="content:read">
      <TestimonialsContent />
    </RequireAuth>
  );
}

function StarRatingField() {
  return (
    <FormField
      name="rating"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Rating</FormLabel>
          <FormControl>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
                  onClick={() => field.onChange(star)}
                  className="p-0.5"
                >
                  <StarIcon
                    className={cn('size-6', star <= (field.value ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')}
                  />
                </button>
              ))}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function TestimonialDialog({ testimonial, onDone }: { testimonial?: AdminTestimonial; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [progress, setProgress] = React.useState(0);
  const form = useZodForm(testimonialUpsertSchema, {
    defaultValues: {
      authorName: testimonial?.authorName ?? '',
      authorTitle: testimonial?.authorTitle ?? '',
      company: testimonial?.company ?? '',
      avatarUrl: testimonial?.avatarUrl ?? '',
      quote: testimonial?.quote ?? '',
      rating: testimonial?.rating ?? 5,
      featured: testimonial?.featured ?? false,
      published: testimonial?.published ?? true,
      order: 0,
    },
  });

  async function onSubmit(values: TestimonialUpsertInput) {
    try {
      let avatarUrl = values.avatarUrl;
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        formData.append('purpose', 'AVATAR');
        const result = await api.upload<{ data: { url: string } }>('/admin/uploads', formData, { onProgress: setProgress });
        avatarUrl = result.data.url;
      }
      const payload = { ...values, avatarUrl };
      if (testimonial) {
        await api.patch(`/admin/testimonials/${testimonial.id}`, payload);
        toast.success('Testimonial updated');
      } else {
        await api.post('/admin/testimonials', payload);
        toast.success('Testimonial created');
      }
      setOpen(false);
      form.reset();
      setAvatarFile(null);
      onDone();
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {testimonial ? (
          <Button variant="ghost" size="icon-sm" aria-label="Edit testimonial"><PencilIcon className="size-4" /></Button>
        ) : (
          <Button><PlusIcon className="size-4" /> New testimonial</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{testimonial ? 'Edit testimonial' : 'New testimonial'}</DialogTitle>
          <DialogDescription>Client quotes shown on the homepage and case studies.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FileDropzone purpose="AVATAR" value={avatarFile} onChange={setAvatarFile} progress={progress} label="Avatar" />
            <TextField name="authorName" label="Author name" required />
            <div className="grid grid-cols-2 gap-4">
              <TextField name="authorTitle" label="Title" />
              <TextField name="company" label="Company" />
            </div>
            <TextareaField name="quote" label="Quote" required rows={4} maxLength={2000} />
            <StarRatingField />
            <div className="grid grid-cols-2 gap-4">
              <SwitchField name="featured" label="Featured" />
              <SwitchField name="published" label="Published" />
            </div>
            <SubmitButton className="w-full">{testimonial ? 'Save changes' : 'Create testimonial'}</SubmitButton>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function TestimonialsContent() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'testimonials', { all: true }],
    queryFn: () =>
      api.getList<AdminTestimonial>('/admin/testimonials', { query: { pageSize: 100, sort: 'order:asc' } }) as Promise<
        Paginated<AdminTestimonial>
      >,
  });

  const items = data?.data ?? [];
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'testimonials'] });
    revalidatePublicSite('testimonials');
  };

  async function reorder(nextIds: string[]) {
    try {
      await api.patch('/admin/testimonials/reorder', { ids: nextIds });
      invalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const ids = items.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder(ids);
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/admin/testimonials/${id}`);
      toast.success('Testimonial deleted');
      invalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Testimonials"
        description="Client quotes shown on the homepage and case studies."
        actions={<Can permission="content:write"><TestimonialDialog onDone={invalidate} /></Can>}
      />
      {isLoading ? (
        <StatsSkeleton count={3} />
      ) : error ? (
        <ErrorState error={error} onAction={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="No testimonials yet" description="Add your first client quote." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-xl border p-5">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={item.avatarUrl ?? undefined} alt={item.authorName} />
                  <AvatarFallback>{initials(item.authorName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.authorName}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {[item.authorTitle, item.company].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon key={i} className={cn('size-3.5', i < item.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
                ))}
              </div>
              <p className="text-muted-foreground line-clamp-4 flex-1 text-sm">&ldquo;{item.quote}&rdquo;</p>
              <div className="flex items-center gap-1.5">
                {item.featured ? <Badge variant="secondary">Featured</Badge> : null}
                <Badge variant={item.published === false ? 'outline' : 'default'}>
                  {item.published === false ? 'Draft' : 'Published'}
                </Badge>
              </div>
              <Can permission="content:write">
                <div className="flex items-center justify-end gap-0.5 border-t pt-2">
                  <Button variant="ghost" size="icon-sm" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                    <ArrowUpIcon className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Move down" disabled={index === items.length - 1} onClick={() => move(index, 1)}>
                    <ArrowDownIcon className="size-4" />
                  </Button>
                  <TestimonialDialog testimonial={item} onDone={invalidate} />
                  <ConfirmDialog
                    trigger={<Button variant="ghost" size="icon-sm" aria-label="Delete testimonial"><Trash2Icon className="size-4" /></Button>}
                    title="Delete this testimonial?"
                    variant="destructive"
                    onConfirm={() => handleDelete(item.id)}
                  />
                </div>
              </Can>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
