'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { slugSchema, technologyUpsertSchema, type Technology, type TechnologyCategory, type TechnologyUpsertInput } from '@kmg/shared';

import { ConfirmDialog, EmptyState, ErrorState, PageHeader, TableSkeleton, TechLogo } from '@/components/shared';
import {
  Form,
  SelectField,
  SubmitButton,
  TextField,
  applyApiErrorToForm,
  useZodForm,
} from '@/components/forms';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, errorMessage } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { Can, RequireAuth } from '@/lib/auth';
import { revalidatePublicSite } from '@/lib/revalidate';

/**
 * The shared package does not export an upsert schema for technology categories (only for
 * technologies themselves) — a small gap in the API contract. This mirrors the shape the
 * admin `/admin/technology-categories` CRUD endpoints expect, reusing `slugSchema` from
 * `@kmg/shared` for the primitive.
 */
const technologyCategoryFormSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema.optional(),
  order: z.coerce.number().int().default(0),
});
type TechnologyCategoryFormInput = z.input<typeof technologyCategoryFormSchema>;

/** The shared `Technology` type omits `order` even though the upsert schema requires it. */
type AdminTechnology = Technology & { order: number };

export default function TechnologiesPage() {
  return (
    <RequireAuth permission="content:read">
      <TechnologiesContent />
    </RequireAuth>
  );
}

function TechnologiesContent() {
  const { data: categories, isLoading, error, refetch } = useQuery({
    queryKey: qk.admin.technologyCategories,
    queryFn: () => api.getData<TechnologyCategory[]>('/admin/technology-categories'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Technologies" description="Manage the technology stack shown on the public site." />
      <Tabs defaultValue="technologies">
        <TabsList>
          <TabsTrigger value="technologies">Technologies</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="technologies" className="mt-6">
          {isLoading ? (
            <TableSkeleton columns={4} />
          ) : error ? (
            <ErrorState error={error} onAction={() => refetch()} />
          ) : (
            <TechnologiesPanel categories={categories ?? []} />
          )}
        </TabsContent>
        <TabsContent value="categories" className="mt-6">
          {isLoading ? (
            <TableSkeleton columns={3} />
          ) : error ? (
            <ErrorState error={error} onAction={() => refetch()} />
          ) : (
            <CategoriesPanel categories={categories ?? []} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

function CategoryDialog({ category, onDone }: { category?: TechnologyCategory; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const form = useZodForm(technologyCategoryFormSchema, {
    defaultValues: { name: category?.name ?? '', slug: category?.slug ?? '', order: category?.order ?? 0 },
  });

  async function onSubmit(values: TechnologyCategoryFormInput) {
    try {
      if (category) {
        await api.patch(`/admin/technology-categories/${category.id}`, values);
        toast.success('Category updated');
      } else {
        await api.post('/admin/technology-categories', values);
        toast.success('Category created');
      }
      setOpen(false);
      form.reset();
      onDone();
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {category ? (
          <Button variant="ghost" size="icon-sm" aria-label="Edit category"><PencilIcon className="size-4" /></Button>
        ) : (
          <Button size="sm"><PlusIcon className="size-4" /> New category</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Edit category' : 'New category'}</DialogTitle>
          <DialogDescription>Groups technologies on the public technologies page.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <TextField name="name" label="Name" required />
            <TextField name="slug" label="Slug" placeholder="auto-generated if left blank" />
            <TextField name="order" label="Display order" type="number" />
            <SubmitButton className="w-full">{category ? 'Save changes' : 'Create category'}</SubmitButton>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CategoriesPanel({ categories }: { categories: TechnologyCategory[] }) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: qk.admin.technologyCategories });
    revalidatePublicSite('technologies');
  };

  async function handleDelete(id: string) {
    try {
      await api.delete(`/admin/technology-categories/${id}`);
      toast.success('Category deleted');
      invalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const sorted = [...categories].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Can permission="content:write"><CategoryDialog onDone={invalidate} /></Can>
      </div>
      {sorted.length === 0 ? (
        <EmptyState title="No categories yet" description="Create a category to start grouping technologies." />
      ) : (
        <div className="divide-border divide-y rounded-xl border">
          {sorted.map((category) => (
            <div key={category.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="font-medium">{category.name}</p>
                <p className="text-muted-foreground truncate text-sm">
                  /{category.slug} · {category.technologies.length} technologies
                </p>
              </div>
              <Can permission="content:write">
                <div className="flex items-center gap-1">
                  <CategoryDialog category={category} onDone={invalidate} />
                  <ConfirmDialog
                    trigger={<Button variant="ghost" size="icon-sm" aria-label="Delete category"><Trash2Icon className="size-4" /></Button>}
                    title={`Delete "${category.name}"?`}
                    description="Technologies in this category must be reassigned first."
                    variant="destructive"
                    onConfirm={() => handleDelete(category.id)}
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

/* -------------------------------------------------------------------------- */
/* Technologies                                                               */
/* -------------------------------------------------------------------------- */

function TechnologyDialog({
  technology,
  categories,
  onDone,
}: {
  technology?: AdminTechnology;
  categories: TechnologyCategory[];
  onDone: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const form = useZodForm(technologyUpsertSchema, {
    defaultValues: {
      name: technology?.name ?? '',
      slug: technology?.slug ?? '',
      categoryId: technology?.categoryId ?? categories[0]?.id ?? '',
      description: technology?.description ?? '',
      logoUrl: technology?.logoUrl ?? '',
      websiteUrl: technology?.websiteUrl ?? '',
      order: technology?.order ?? 0,
    },
  });

  async function onSubmit(values: TechnologyUpsertInput) {
    try {
      if (technology) {
        await api.patch(`/admin/technologies/${technology.id}`, values);
        toast.success('Technology updated');
      } else {
        await api.post('/admin/technologies', values);
        toast.success('Technology created');
      }
      setOpen(false);
      form.reset();
      onDone();
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }

  const logoUrl = form.watch('logoUrl');
  const name = form.watch('name');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {technology ? (
          <Button variant="ghost" size="icon-sm" aria-label="Edit technology"><PencilIcon className="size-4" /></Button>
        ) : (
          <Button size="sm"><PlusIcon className="size-4" /> New technology</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{technology ? 'Edit technology' : 'New technology'}</DialogTitle>
          <DialogDescription>Shown on the public technologies page and service/case study cards.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center gap-3">
              <TechLogo slug={logoUrl} name={name || 'Technology'} size={40} />
              <TextField name="logoUrl" label="Logo (simpleicons.org slug or full URL)" className="flex-1" placeholder="kubernetes" />
            </div>
            <TextField name="name" label="Name" required />
            <TextField name="slug" label="Slug" placeholder="auto-generated if left blank" />
            <SelectField
              name="categoryId"
              label="Category"
              required
              options={categories.map((category) => ({ label: category.name, value: category.id }))}
            />
            <TextField name="websiteUrl" label="Website URL" placeholder="https://kubernetes.io" />
            <TextField name="order" label="Display order" type="number" />
            <SubmitButton className="w-full">{technology ? 'Save changes' : 'Create technology'}</SubmitButton>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function TechnologiesPanel({ categories }: { categories: TechnologyCategory[] }) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: qk.admin.technologyCategories });
    revalidatePublicSite('technologies');
  };
  const technologies = React.useMemo(
    () =>
      categories
        .flatMap((category) =>
          (category.technologies as AdminTechnology[]).map((tech) => ({ ...tech, categoryName: category.name })),
        )
        .sort((a, b) => a.order - b.order),
    [categories],
  );

  async function reorder(nextIds: string[]) {
    try {
      await api.patch('/admin/technologies/reorder', { ids: nextIds });
      invalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= technologies.length) return;
    const ids = technologies.map((tech) => tech.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder(ids);
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/admin/technologies/${id}`);
      toast.success('Technology deleted');
      invalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Can permission="content:write"><TechnologyDialog categories={categories} onDone={invalidate} /></Can>
      </div>
      {technologies.length === 0 ? (
        <EmptyState title="No technologies yet" description="Add a category first, then add technologies to it." />
      ) : (
        <div className="divide-border divide-y rounded-xl border">
          {technologies.map((tech, index) => (
            <div key={tech.id} className="flex items-center gap-4 p-4">
              <TechLogo slug={tech.logoUrl} name={tech.name} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{tech.name}</p>
                <p className="text-muted-foreground truncate text-sm">{tech.categoryName}</p>
              </div>
              <Can permission="content:write">
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon-sm" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                    <ArrowUpIcon className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Move down" disabled={index === technologies.length - 1} onClick={() => move(index, 1)}>
                    <ArrowDownIcon className="size-4" />
                  </Button>
                  <TechnologyDialog technology={tech} categories={categories} onDone={invalidate} />
                  <ConfirmDialog
                    trigger={<Button variant="ghost" size="icon-sm" aria-label="Delete technology"><Trash2Icon className="size-4" /></Button>}
                    title={`Delete "${tech.name}"?`}
                    variant="destructive"
                    onConfirm={() => handleDelete(tech.id)}
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
