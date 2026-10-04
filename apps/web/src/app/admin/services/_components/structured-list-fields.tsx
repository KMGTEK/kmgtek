'use client';

import { PlusIcon, XIcon } from 'lucide-react';
import { useFormContext, type FieldPath, type FieldValues } from 'react-hook-form';

import { DynamicIcon } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/** `{ icon, title, description }[]` — service benefits. */
export function BenefitsField<TValues extends FieldValues>({ name }: { name: FieldPath<TValues> }) {
  const form = useFormContext<TValues>();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        type Row = { icon?: string; title: string; description: string };
        const rows = ((field.value as Row[] | undefined) ?? []) as Row[];
        const update = (next: Row[]) => field.onChange(next);
        return (
          <FormItem>
            <FormLabel>Benefits</FormLabel>
            <FormControl>
              <div className="space-y-3">
                {rows.map((row, index) => (
                  <div key={index} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-muted grid size-9 shrink-0 place-items-center rounded-md">
                        <DynamicIcon name={row.icon ?? 'Sparkles'} className="size-4" />
                      </div>
                      <Input
                        value={row.icon ?? ''}
                        placeholder="Lucide icon name (e.g. Rocket)"
                        onChange={(event) => update(rows.map((r, i) => (i === index ? { ...r, icon: event.target.value } : r)))}
                      />
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove benefit" onClick={() => update(rows.filter((_, i) => i !== index))}>
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                    <Input
                      value={row.title}
                      placeholder="Title"
                      onChange={(event) => update(rows.map((r, i) => (i === index ? { ...r, title: event.target.value } : r)))}
                    />
                    <Textarea
                      value={row.description}
                      placeholder="Description"
                      rows={2}
                      onChange={(event) => update(rows.map((r, i) => (i === index ? { ...r, description: event.target.value } : r)))}
                    />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => update([...rows, { icon: '', title: '', description: '' }])}>
                  <PlusIcon className="size-4" /> Add benefit
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

/** `{ title, description }[]` — service process steps. */
export function ProcessField<TValues extends FieldValues>({ name }: { name: FieldPath<TValues> }) {
  const form = useFormContext<TValues>();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        type Row = { title: string; description: string };
        const rows = ((field.value as Row[] | undefined) ?? []) as Row[];
        const update = (next: Row[]) => field.onChange(next);
        return (
          <FormItem>
            <FormLabel>Process steps</FormLabel>
            <FormControl>
              <div className="space-y-3">
                {rows.map((row, index) => (
                  <div key={index} className="flex gap-2 rounded-lg border p-3">
                    <span className="text-muted-foreground grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold">
                      {index + 1}
                    </span>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={row.title}
                        placeholder="Step title"
                        onChange={(event) => update(rows.map((r, i) => (i === index ? { ...r, title: event.target.value } : r)))}
                      />
                      <Textarea
                        value={row.description}
                        placeholder="Description"
                        rows={2}
                        onChange={(event) => update(rows.map((r, i) => (i === index ? { ...r, description: event.target.value } : r)))}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove step" onClick={() => update(rows.filter((_, i) => i !== index))}>
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => update([...rows, { title: '', description: '' }])}>
                  <PlusIcon className="size-4" /> Add step
                </Button>
              </div>
            </FormControl>
            <FormDescription>Shown in order on the service page.</FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

/** `{ question, answer }[]` — service FAQs. */
export function FaqsField<TValues extends FieldValues>({ name }: { name: FieldPath<TValues> }) {
  const form = useFormContext<TValues>();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        type Row = { question: string; answer: string };
        const rows = ((field.value as Row[] | undefined) ?? []) as Row[];
        const update = (next: Row[]) => field.onChange(next);
        return (
          <FormItem>
            <FormLabel>FAQs</FormLabel>
            <FormControl>
              <div className="space-y-3">
                {rows.map((row, index) => (
                  <div key={index} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={row.question}
                        placeholder="Question"
                        onChange={(event) => update(rows.map((r, i) => (i === index ? { ...r, question: event.target.value } : r)))}
                      />
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove FAQ" onClick={() => update(rows.filter((_, i) => i !== index))}>
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={row.answer}
                      placeholder="Answer"
                      rows={2}
                      onChange={(event) => update(rows.map((r, i) => (i === index ? { ...r, answer: event.target.value } : r)))}
                    />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => update([...rows, { question: '', answer: '' }])}>
                  <PlusIcon className="size-4" /> Add FAQ
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
