'use client';

import { PlusIcon, XIcon } from 'lucide-react';
import { useFormContext, type FieldPath, type FieldValues } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export interface MetricRow {
  label: string;
  value: string;
}

/** Repeatable label+value pairs (e.g. "40% faster deploys") for case study impact metrics. */
export function MetricsField<TValues extends FieldValues>({
  name,
  label,
  description,
}: {
  name: FieldPath<TValues>;
  label?: string;
  description?: string;
}) {
  const form = useFormContext<TValues>();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const rows = ((field.value as MetricRow[] | undefined) ?? []) as MetricRow[];
        const update = (next: MetricRow[]) => field.onChange(next);
        return (
          <FormItem>
            {label ? <FormLabel>{label}</FormLabel> : null}
            <FormControl>
              <div className="space-y-2">
                {rows.map((row, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={row.value}
                      placeholder="40%"
                      className="w-28"
                      onChange={(event) => {
                        const next = [...rows];
                        next[index] = { ...next[index], value: event.target.value };
                        update(next);
                      }}
                    />
                    <Input
                      value={row.label}
                      placeholder="Faster deployments"
                      className="flex-1"
                      onChange={(event) => {
                        const next = [...rows];
                        next[index] = { ...next[index], label: event.target.value };
                        update(next);
                      }}
                    />
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove metric" onClick={() => update(rows.filter((_, i) => i !== index))}>
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => update([...rows, { label: '', value: '' }])}>
                  <PlusIcon className="size-4" /> Add metric
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
