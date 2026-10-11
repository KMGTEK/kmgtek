'use client';

import { GripVerticalIcon, PlusIcon, XIcon } from 'lucide-react';
import * as React from 'react';
import { useFormContext, type FieldPath, type FieldValues } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/* TagInput — chips for `string[]` (skills, keywords, benefits)                 */
/* -------------------------------------------------------------------------- */

export interface TagInputBaseProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  max?: number;
  /** Suggestions shown as quick-add chips. */
  suggestions?: string[];
  className?: string;
  id?: string;
}

export function TagInputBase({
  value,
  onChange,
  placeholder = 'Type and press Enter…',
  disabled,
  max,
  suggestions,
  className,
  id,
}: TagInputBaseProps) {
  const [draft, setDraft] = React.useState('');

  const add = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (value.some((item) => item.toLowerCase() === tag.toLowerCase())) {
      setDraft('');
      return;
    }
    if (max && value.length >= max) return;
    onChange([...value, tag]);
    setDraft('');
  };

  const remove = (tag: string) => onChange(value.filter((item) => item !== tag));

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'border-input focus-within:border-ring focus-within:ring-ring/50 flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border bg-transparent px-2 py-1.5 text-sm transition-[color,box-shadow] focus-within:ring-[3px]',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => remove(tag)}
              className="hover:text-destructive"
            >
              <XIcon className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          disabled={disabled}
          placeholder={value.length === 0 ? placeholder : ''}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              add(draft);
            } else if (event.key === 'Backspace' && !draft && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          onBlur={() => add(draft)}
          className="min-w-[8ch] flex-1 bg-transparent outline-none"
        />
      </div>
      {suggestions?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions
            .filter((suggestion) => !value.includes(suggestion))
            .slice(0, 8)
            .map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => add(suggestion)}
                className="text-muted-foreground hover:border-brand-400 hover:text-foreground rounded-full border border-dashed px-2 py-0.5 text-xs"
              >
                + {suggestion}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}

export interface TagInputProps<TValues extends FieldValues> {
  name: FieldPath<TValues>;
  label?: string;
  description?: string;
  placeholder?: string;
  suggestions?: string[];
  max?: number;
  className?: string;
}

/** RHF-connected chips input for `string[]` fields. */
export function TagInput<TValues extends FieldValues>({
  name,
  label,
  description,
  placeholder,
  suggestions,
  max,
  className,
}: TagInputProps<TValues>) {
  const form = useFormContext<TValues>();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label ? <FormLabel>{label}</FormLabel> : null}
          <FormControl>
            <TagInputBase
              value={(field.value as string[] | undefined) ?? []}
              onChange={field.onChange}
              placeholder={placeholder}
              suggestions={suggestions}
              max={max}
              disabled={form.formState.isSubmitting}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* ListInput — ordered list of lines (responsibilities, requirements…)         */
/* -------------------------------------------------------------------------- */

export interface ListInputProps<TValues extends FieldValues> {
  name: FieldPath<TValues>;
  label?: string;
  description?: string;
  placeholder?: string;
  addLabel?: string;
  className?: string;
}

/** RHF-connected repeatable text rows for `string[]` fields. */
export function ListInput<TValues extends FieldValues>({
  name,
  label,
  description,
  placeholder = 'Add an item…',
  addLabel = 'Add item',
  className,
}: ListInputProps<TValues>) {
  const form = useFormContext<TValues>();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const items = ((field.value as string[] | undefined) ?? []) as string[];
        const update = (next: string[]) => field.onChange(next);

        return (
          <FormItem className={className}>
            {label ? <FormLabel>{label}</FormLabel> : null}
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <GripVerticalIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
                  <Input
                    value={item}
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
                    aria-label={`Remove item ${index + 1}`}
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
