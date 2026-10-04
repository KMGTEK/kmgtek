'use client';

import { GripVerticalIcon, Loader2Icon, PlusIcon, XIcon } from 'lucide-react';
import * as React from 'react';
import { useFormContext, type FieldPath, type FieldValues } from 'react-hook-form';
import { toast } from 'sonner';

import { validateFile } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { api, errorMessage } from '@/lib/api/client';

export interface GalleryImage {
  url: string;
  caption?: string;
}

/**
 * Repeatable, reorderable image gallery (cover-style thumbnails + captions) backed by
 * `/admin/uploads` with purpose `CASE_STUDY_IMAGE`. Reordering uses up/down buttons instead
 * of drag-and-drop for robustness.
 */
export function GalleryField<TValues extends FieldValues>({
  name,
  label,
  description,
}: {
  name: FieldPath<TValues>;
  label?: string;
  description?: string;
}) {
  const form = useFormContext<TValues>();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const images = ((field.value as GalleryImage[] | undefined) ?? []) as GalleryImage[];
        const update = (next: GalleryImage[]) => field.onChange(next);

        const move = (index: number, direction: -1 | 1) => {
          const target = index + direction;
          if (target < 0 || target >= images.length) return;
          const next = [...images];
          [next[index], next[target]] = [next[target], next[index]];
          update(next);
        };

        async function handleFiles(files: FileList | null) {
          if (!files?.length) return;
          setUploading(true);
          try {
            const uploaded: GalleryImage[] = [];
            for (const file of Array.from(files)) {
              const invalid = validateFile(file, 'CASE_STUDY_IMAGE');
              if (invalid) {
                toast.error(invalid);
                continue;
              }
              const formData = new FormData();
              formData.append('file', file);
              formData.append('purpose', 'CASE_STUDY_IMAGE');
              const result = await api.upload<{ data: { url: string } }>('/admin/uploads', formData);
              uploaded.push({ url: result.data.url, caption: '' });
            }
            if (uploaded.length) update([...images, ...uploaded]);
          } catch (error) {
            toast.error(errorMessage(error));
          } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
          }
        }

        return (
          <FormItem>
            {label ? <FormLabel>{label}</FormLabel> : null}
            <FormControl>
              <div className="space-y-3">
                {images.map((image, index) => (
                  <div key={`${image.url}-${index}`} className="bg-muted/30 flex items-center gap-3 rounded-lg border p-3">
                    <GripVerticalIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt="" className="size-14 shrink-0 rounded-md border object-cover" />
                    <Input
                      value={image.caption ?? ''}
                      placeholder="Caption (optional)"
                      onChange={(event) => {
                        const next = [...images];
                        next[index] = { ...next[index], caption: event.target.value };
                        update(next);
                      }}
                      className="flex-1"
                    />
                    <div className="flex items-center gap-0.5">
                      <Button type="button" variant="ghost" size="icon-sm" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up">
                        ↑
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" disabled={index === images.length - 1} onClick={() => move(index, 1)} aria-label="Move down">
                        ↓
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove image"
                        onClick={() => update(images.filter((_, i) => i !== index))}
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
                  {uploading ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
                  Add images
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(event) => handleFiles(event.target.files)}
                />
              </div>
            </FormControl>
            {description ? <FormDescription>{description}</FormDescription> : null}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
