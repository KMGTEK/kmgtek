'use client';

import * as React from 'react';
import { useFormContext, type FieldPath, type FieldValues } from 'react-hook-form';

import { DynamicIcon } from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** Curated set of lucide icon names appropriate for service cards. */
export const SERVICE_ICON_NAMES = [
  'CloudUpload', 'Cloud', 'Container', 'Cog', 'Workflow', 'ShieldCheck', 'LayoutGrid',
  'Headset', 'PiggyBank', 'Infinity', 'RefreshCcw', 'BrainCircuit', 'Activity', 'Boxes',
  'Rocket', 'GitBranch', 'Layers', 'Database', 'Cpu', 'Server', 'Network', 'Lock',
  'Gauge', 'BarChart3', 'LineChart', 'Wrench', 'Radar', 'Siren', 'Target', 'Bot',
  'Sparkles', 'Route', 'Scale', 'KeyRound', 'Bug', 'ClipboardCheck', 'FileCheck',
  'Handshake', 'Wallet', 'Eye', 'Zap', 'Plug', 'TrendingUp', 'TrendingDown', 'Users',
] as const;

export interface IconPickerProps<TValues extends FieldValues> {
  name: FieldPath<TValues>;
  label?: string;
  description?: string;
}

export function IconPicker<TValues extends FieldValues>({ name, label, description }: IconPickerProps<TValues>) {
  const form = useFormContext<TValues>();
  const [open, setOpen] = React.useState(false);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const current = (field.value as string | undefined) || 'Sparkles';
        return (
          <FormItem>
            {label ? <FormLabel>{label}</FormLabel> : null}
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button type="button" variant="outline" className="w-fit justify-start gap-2">
                    <DynamicIcon name={current} className="size-4" />
                    {current}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search icons…" />
                  <CommandList>
                    <CommandEmpty>No icons found.</CommandEmpty>
                    <CommandGroup>
                      <div className="grid grid-cols-6 gap-1 p-1">
                        {SERVICE_ICON_NAMES.map((icon) => (
                          <CommandItem
                            key={icon}
                            value={icon}
                            onSelect={() => {
                              field.onChange(icon);
                              setOpen(false);
                            }}
                            className={cn(
                              'flex aspect-square items-center justify-center rounded-md p-0',
                              current === icon && 'bg-accent',
                            )}
                          >
                            <DynamicIcon name={icon} className="size-4" />
                            <span className="sr-only">{icon}</span>
                          </CommandItem>
                        ))}
                      </div>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {description ? <FormDescription>{description}</FormDescription> : null}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
