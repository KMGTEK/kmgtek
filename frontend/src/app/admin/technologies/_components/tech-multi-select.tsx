'use client';

import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';
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
  id: string;
  label: string;
}

export interface TechMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/** Popover + command palette multi-select — used for the technologies picker on services and case studies. */
export function TechMultiSelect({
  value,
  onChange,
  options,
  placeholder = 'Select technologies…',
  disabled,
  className,
}: TechMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selected = options.filter((option) => value.includes(option.id));

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('h-auto min-h-10 w-full justify-between font-normal', className)}
        >
          <span className="flex flex-1 flex-wrap gap-1 overflow-hidden text-left">
            {selected.length ? (
              selected.map((option) => (
                <Badge key={option.id} variant="secondary">
                  {option.label}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search technologies…" />
          <CommandList>
            <CommandEmpty>No technologies found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option.id} value={option.label} onSelect={() => toggle(option.id)}>
                  <CheckIcon
                    className={cn('mr-2 size-4', value.includes(option.id) ? 'opacity-100' : 'opacity-0')}
                    aria-hidden
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
