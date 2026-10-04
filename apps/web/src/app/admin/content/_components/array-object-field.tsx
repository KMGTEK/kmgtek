'use client';

import { PlusIcon, XIcon } from 'lucide-react';
import { useFormContext, type FieldPath, type FieldValues } from 'react-hook-form';

import { DynamicIcon } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/**
 * Generic repeatable-row editor for content-block array fields — `{title, description}[]`,
 * `{icon, title, description}[]`, `{name, detail}[]`, `{label, value, suffix}[]`, etc. One
 * column spec per object key covers every array shape in `CONTENT_BLOCK_SCHEMAS` without a
 * bespoke component per content block.
 */
export interface ArrayFieldColumn {
  key: string;
  label: string;
  kind?: 'text' | 'textarea' | 'icon' | 'number';
  placeholder?: string;
}

export interface ArrayObjectFieldProps<TValues extends FieldValues> {
  name: FieldPath<TValues>;
  label?: string;
  description?: string;
  columns: ArrayFieldColumn[];
  emptyRow: Record<string, unknown>;
  addLabel?: string;
}

export function ArrayObjectField<TValues extends FieldValues>({
  name,
  label,
  description,
  columns,
  emptyRow,
  addLabel = 'Add item',
}: ArrayObjectFieldProps<TValues>) {
  const form = useFormContext<TValues>();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const rows = (field.value as Record<string, unknown>[] | undefined) ?? [];
        const update = (next: Record<string, unknown>[]) => field.onChange(next);

        return (
          <FormItem>
            {label ? <FormLabel>{label}</FormLabel> : null}
            <FormControl>
              <div className="space-y-3">
                {rows.map((row, index) => (
                  <div key={index} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground text-xs font-semibold">Item {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove item ${index + 1}`}
                        onClick={() => update(rows.filter((_, i) => i !== index))}
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                    {columns.map((col) => {
                      const value = row[col.key];
                      const onChange = (next: unknown) =>
                        update(rows.map((r, i) => (i === index ? { ...r, [col.key]: next } : r)));

                      if (col.kind === 'icon') {
                        return (
                          <div key={col.key} className="flex items-center gap-2">
                            <div className="bg-muted grid size-9 shrink-0 place-items-center rounded-md">
                              <DynamicIcon name={(value as string) || 'Sparkles'} className="size-4" />
                            </div>
                            <Input
                              value={(value as string) ?? ''}
                              placeholder={col.placeholder ?? `${col.label} (lucide icon name, e.g. Rocket)`}
                              onChange={(event) => onChange(event.target.value)}
                            />
                          </div>
                        );
                      }
                      if (col.kind === 'textarea') {
                        return (
                          <Textarea
                            key={col.key}
                            value={(value as string) ?? ''}
                            placeholder={col.placeholder ?? col.label}
                            rows={2}
                            onChange={(event) => onChange(event.target.value)}
                          />
                        );
                      }
                      if (col.kind === 'number') {
                        return (
                          <Input
                            key={col.key}
                            type="number"
                            value={(value as number | undefined) ?? 0}
                            placeholder={col.placeholder ?? col.label}
                            onChange={(event) => onChange(Number(event.target.value))}
                          />
                        );
                      }
                      return (
                        <Input
                          key={col.key}
                          value={(value as string) ?? ''}
                          placeholder={col.placeholder ?? col.label}
                          onChange={(event) => onChange(event.target.value)}
                        />
                      );
                    })}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => update([...rows, { ...emptyRow }])}>
                  <PlusIcon className="size-4" /> {addLabel}
                </Button>
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

/** Repeatable multi-line text rows (long paragraphs, quotes) — like `ListInput` but with a `Textarea`. */
export function TextareaListField<TValues extends FieldValues>({
  name,
  label,
  description,
  placeholder = 'Add a paragraph…',
  addLabel = 'Add paragraph',
}: {
  name: FieldPath<TValues>;
  label?: string;
  description?: string;
  placeholder?: string;
  addLabel?: string;
}) {
  const form = useFormContext<TValues>();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const items = ((field.value as string[] | undefined) ?? []) as string[];
        const update = (next: string[]) => field.onChange(next);

        return (
          <FormItem>
            {label ? <FormLabel>{label}</FormLabel> : null}
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Textarea
                    value={item}
                    rows={3}
                    placeholder={placeholder}
                    onChange={(event) => {
                      const next = [...items];
                      next[index] = event.target.value;
                      update(next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove paragraph ${index + 1}`}
                    onClick={() => update(items.filter((_, i) => i !== index))}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => update([...items, ''])}>
                <PlusIcon className="size-4" />
                {addLabel}
              </Button>
            </div>
            {description ? <FormDescription>{description}</FormDescription> : null}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
