'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DownloadIcon, FileTextIcon, StarIcon, Trash2Icon } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import type { Resume } from '@kmg/shared';

import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { FileDropzone } from '@/components/shared/file-dropzone';
import { ListSkeleton } from '@/components/shared/loading-skeletons';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api, errorMessage } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { formatDate } from '@/lib/utils';

export function ResumesClient() {
  const queryClient = useQueryClient();
  const [file, setFile] = React.useState<File | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [uploading, setUploading] = React.useState(false);

  const { data: resumes, isLoading, error, refetch } = useQuery({
    queryKey: qk.me.resumes,
    queryFn: () => api.getData<Resume[]>('/me/resumes'),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.me.resumes });

  const primaryMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/me/resumes/${id}/primary`),
    onSuccess: () => {
      toast.success('Primary resume updated');
      void invalidate();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/me/resumes/${id}`),
    onSuccess: () => {
      toast.success('Resume deleted');
      void invalidate();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  async function upload() {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setUploading(true);
      setProgress(0);
      await api.upload('/me/resumes', formData, { onProgress: setProgress });
      toast.success('Resume uploaded');
      setFile(null);
      await invalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Resumes" description="Upload one or more resumes and choose which one recruiters see first." />

      <Card className="gap-4 p-6">
        <h2 className="font-display text-base font-semibold">Upload a resume</h2>
        <FileDropzone purpose="RESUME" value={file} onChange={setFile} disabled={uploading} progress={uploading ? progress : undefined} />
        {file ? (
          <Button className="w-fit" onClick={() => void upload()} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        ) : null}
      </Card>

      {isLoading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState error={error} onAction={() => refetch()} />
      ) : !resumes || resumes.length === 0 ? (
        <EmptyState
          icon={<FileTextIcon className="size-5" />}
          title="No resumes yet"
          description="Upload a resume above so you can apply faster and let recruiters find you."
        />
      ) : (
        <ul className="divide-border divide-y rounded-xl border">
          {resumes.map((resume) => (
            <li key={resume.id} className="flex items-center gap-4 p-4">
              <span className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-lg">
                <FileTextIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{resume.file.originalName}</p>
                  {resume.isPrimary ? <Badge>Primary</Badge> : null}
                </div>
                <p className="text-muted-foreground text-xs">Uploaded {formatDate(resume.createdAt)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {!resume.isPrimary ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Set as primary"
                    title="Set as primary"
                    disabled={primaryMutation.isPending}
                    onClick={() => primaryMutation.mutate(resume.id)}
                  >
                    <StarIcon className="size-4" />
                  </Button>
                ) : null}
                <Button variant="ghost" size="icon-sm" aria-label="Download" asChild>
                  <a href={resume.file.url} target="_blank" rel="noopener noreferrer" download>
                    <DownloadIcon className="size-4" />
                  </a>
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label="Delete resume">
                      <Trash2Icon className="size-4" />
                    </Button>
                  }
                  title="Delete this resume?"
                  description="You won't be able to select it for future applications."
                  variant="destructive"
                  confirmLabel="Delete"
                  onConfirm={() => deleteMutation.mutateAsync(resume.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
