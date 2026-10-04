'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { teamMemberUpsertSchema, type Paginated, type TeamMember, type TeamMemberUpsertInput } from '@kmg/shared';

import { SocialIcon } from '@/components/brand/social-icons';
import { ConfirmDialog, EmptyState, ErrorState, FileDropzone, PageHeader, StatsSkeleton } from '@/components/shared';
import {
  Form,
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
import { initials } from '@/lib/utils';

type AdminTeamMember = TeamMember & { published?: boolean };

export default function TeamPage() {
  return (
    <RequireAuth permission="content:read">
      <TeamContent />
    </RequireAuth>
  );
}

function TeamMemberDialog({ member, onDone }: { member?: AdminTeamMember; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [progress, setProgress] = React.useState(0);
  const form = useZodForm(teamMemberUpsertSchema, {
    defaultValues: {
      name: member?.name ?? '',
      title: member?.title ?? '',
      bio: member?.bio ?? '',
      photoUrl: member?.photoUrl ?? '',
      linkedinUrl: member?.linkedinUrl ?? '',
      twitterUrl: member?.twitterUrl ?? '',
      isLeadership: member?.isLeadership ?? false,
      published: member?.published ?? true,
      order: 0,
    },
  });

  async function onSubmit(values: TeamMemberUpsertInput) {
    try {
      let photoUrl = values.photoUrl;
      if (photoFile) {
        const formData = new FormData();
        formData.append('file', photoFile);
        formData.append('purpose', 'TEAM_PHOTO');
        const result = await api.upload<{ data: { url: string } }>('/admin/uploads', formData, { onProgress: setProgress });
        photoUrl = result.data.url;
      }
      const payload = { ...values, photoUrl };
      if (member) {
        await api.patch(`/admin/team-members/${member.id}`, payload);
        toast.success('Team member updated');
      } else {
        await api.post('/admin/team-members', payload);
        toast.success('Team member created');
      }
      setOpen(false);
      form.reset();
      setPhotoFile(null);
      onDone();
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {member ? (
          <Button variant="ghost" size="icon-sm" aria-label="Edit team member"><PencilIcon className="size-4" /></Button>
        ) : (
          <Button><PlusIcon className="size-4" /> New team member</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{member ? 'Edit team member' : 'New team member'}</DialogTitle>
          <DialogDescription>Shown on the About page team grid.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FileDropzone purpose="TEAM_PHOTO" value={photoFile} onChange={setPhotoFile} progress={progress} label="Photo" />
            <TextField name="name" label="Name" required />
            <TextField name="title" label="Title" required />
            <TextareaField name="bio" label="Bio" rows={3} maxLength={3000} />
            <div className="grid grid-cols-2 gap-4">
              <TextField name="linkedinUrl" label="LinkedIn URL" />
              <TextField name="twitterUrl" label="X / Twitter URL" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SwitchField name="isLeadership" label="Leadership" />
              <SwitchField name="published" label="Published" />
            </div>
            <SubmitButton className="w-full">{member ? 'Save changes' : 'Create team member'}</SubmitButton>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function TeamContent() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'team-members', { all: true }],
    queryFn: () =>
      api.getList<AdminTeamMember>('/admin/team-members', { query: { pageSize: 100, sort: 'order:asc' } }) as Promise<
        Paginated<AdminTeamMember>
      >,
  });

  const items = data?.data ?? [];
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'team-members'] });
    revalidatePublicSite('team');
  };

  async function reorder(nextIds: string[]) {
    try {
      await api.patch('/admin/team-members/reorder', { ids: nextIds });
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
      await api.delete(`/admin/team-members/${id}`);
      toast.success('Team member deleted');
      invalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Manage the About page team roster."
        actions={<Can permission="content:write"><TeamMemberDialog onDone={invalidate} /></Can>}
      />
      {isLoading ? (
        <StatsSkeleton count={4} />
      ) : error ? (
        <ErrorState error={error} onAction={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="No team members yet" description="Add your first team member." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => (
            <div key={item.id} className="flex flex-col items-center gap-2 rounded-xl border p-5 text-center">
              <Avatar className="size-16">
                <AvatarImage src={item.photoUrl ?? undefined} alt={item.name} />
                <AvatarFallback>{initials(item.name)}</AvatarFallback>
              </Avatar>
              <p className="font-medium">{item.name}</p>
              <p className="text-muted-foreground text-sm">{item.title}</p>
              <div className="flex items-center gap-1.5">
                {item.isLeadership ? <Badge variant="secondary">Leadership</Badge> : null}
                <Badge variant={item.published === false ? 'outline' : 'default'}>
                  {item.published === false ? 'Draft' : 'Published'}
                </Badge>
              </div>
              <div className="text-muted-foreground flex items-center gap-2">
                {item.linkedinUrl ? <SocialIcon name="linkedin" className="size-3.5" /> : null}
                {item.twitterUrl ? <SocialIcon name="twitter" className="size-3.5" /> : null}
              </div>
              <Can permission="content:write">
                <div className="mt-1 flex items-center justify-center gap-0.5 border-t pt-2">
                  <Button variant="ghost" size="icon-sm" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                    <ArrowUpIcon className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Move down" disabled={index === items.length - 1} onClick={() => move(index, 1)}>
                    <ArrowDownIcon className="size-4" />
                  </Button>
                  <TeamMemberDialog member={item} onDone={invalidate} />
                  <ConfirmDialog
                    trigger={<Button variant="ghost" size="icon-sm" aria-label="Delete team member"><Trash2Icon className="size-4" /></Button>}
                    title={`Remove ${item.name}?`}
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
