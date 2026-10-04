'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { categoryUpsertSchema, type CategoryUpsertInput, type JobCategory } from '@kmg/shared';

import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  TableSkeleton,
} from '@/components/shared';
import { Form, SubmitButton, TextField, applyApiErrorToForm, useZodForm } from '@/components/forms';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage } from '@/lib/api/client';
import { revalidatePublicSite } from '@/lib/revalidate';
import { qk } from '@/lib/api/query-keys';
import { Can, RequireAuth } from '@/lib/auth/guards';

function useDepartments() {
  return useQuery({
    queryKey: qk.admin.departments,
    queryFn: () => api.getData<JobCategory[]>('/admin/job-categories'),
  });
}

function DepartmentDialog({
  open,
  onOpenChange,
  department,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: JobCategory | null;
}) {
  const queryClient = useQueryClient();
  const form = useZodForm(categoryUpsertSchema, {
    defaultValues: { name: department?.name ?? '', slug: department?.slug ?? '', description: '' },
  });

  React.useEffect(() => {
    form.reset({ name: department?.name ?? '', slug: department?.slug ?? '', description: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department, open]);

  const mutation = useMutation({
    mutationFn: (values: CategoryUpsertInput) => {
      const payload = { name: values.name, slug: values.slug };
      return department
        ? api.patchData<JobCategory>(`/admin/job-categories/${department.id}`, payload)
        : api.postData<JobCategory>('/admin/job-categories', payload);
    },
    onSuccess: () => {
      toast.success(department ? 'Department updated' : 'Department created');
      queryClient.invalidateQueries({ queryKey: qk.admin.departments });
      revalidatePublicSite('jobs');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(applyApiErrorToForm(error, form));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{department ? 'Edit department' : 'New department'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <TextField name="name" label="Name" placeholder="Engineering" required />
            <TextField name="slug" label="Slug" placeholder="engineering (auto-generated if left blank)" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <SubmitButton>{department ? 'Save changes' : 'Create department'}</SubmitButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DepartmentsContent() {
  const { data, isLoading, error, refetch } = useDepartments();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<JobCategory | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/job-categories/${id}`),
    onSuccess: () => {
      toast.success('Department deleted');
      queryClient.invalidateQueries({ queryKey: qk.admin.departments });
      revalidatePublicSite('jobs');
    },
    onError: (mutationError) => toast.error(errorMessage(mutationError)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Job categories used to organize open roles."
        actions={
          <Can permission="jobs:write">
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <PlusIcon className="size-4" />
              New department
            </Button>
          </Can>
        }
      />

      {isLoading ? (
        <TableSkeleton columns={3} />
      ) : error ? (
        <ErrorState error={error} onAction={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No departments yet" description="Create one to start posting jobs." />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Jobs</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((department) => (
                <TableRow key={department.id}>
                  <TableCell className="font-medium">{department.name}</TableCell>
                  <TableCell className="text-muted-foreground">{department.slug}</TableCell>
                  <TableCell>{department.jobCount ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <Can permission="jobs:write">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Edit department"
                          onClick={() => {
                            setEditing(department);
                            setDialogOpen(true);
                          }}
                        >
                          <PencilIcon className="size-4" />
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label="Delete department">
                              <Trash2Icon className="size-4 text-destructive" />
                            </Button>
                          }
                          title={`Delete "${department.name}"?`}
                          description="Jobs in this department keep their history, but the department disappears from the picker."
                          variant="destructive"
                          confirmLabel="Delete"
                          onConfirm={() => deleteMutation.mutateAsync(department.id)}
                        />
                      </div>
                    </Can>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DepartmentDialog open={dialogOpen} onOpenChange={setDialogOpen} department={editing} />
    </div>
  );
}

export default function AdminDepartmentsPage() {
  return (
    <RequireAuth permission="jobs:read">
      <DepartmentsContent />
    </RequireAuth>
  );
}
