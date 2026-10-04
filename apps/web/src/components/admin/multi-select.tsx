'use client';

import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  label: string;
  value: string;
  sublabel?: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  id?: string;
}

/**
 * Popover + command combobox for multi-value selects (interviewers, assignees).
 * Not RHF-connected itself — wrap it in a `FormField` render prop where needed.
 */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  emptyText = 'No results found.',
  disabled,
  loading,
  className,
  id,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value],
  );

  const toggle = (optionValue: string) => {
    if (value.includes(optionValue)) onChange(value.filter((v) => v !== optionValue));
    else onChange([...value, optionValue]);
  };

  const remove = (optionValue: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn('h-auto min-h-10 w-full justify-between font-normal', className)}
        >
          <span className="flex flex-1 flex-wrap items-center gap-1.5 text-left">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{loading ? 'Loading…' : placeholder}</span>
            ) : (
              selected.map((option) => (
                <Badge key={option.value} variant="secondary" className="gap-1 pr-1">
                  {option.label}
                  <button
                    type="button"
                    aria-label={`Remove ${option.label}`}
                    onClick={(event) => remove(option.value, event)}
                    className="hover:text-destructive"
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              ))
            )}
          </span>
          <ChevronsUpDownIcon className="text-muted-foreground ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.sublabel ?? ''}`}
                    onSelect={() => toggle(option.value)}
                  >
                    <CheckIcon className={cn('size-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                    <span className="flex flex-col">
                      <span>{option.label}</span>
                      {option.sublabel ? (
                        <span className="text-muted-foreground text-xs">{option.sublabel}</span>
                      ) : null}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
