'use client';

import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface IsoDateRange {
  from?: string;
  to?: string;
}

export interface DateRangePickerProps {
  value?: IsoDateRange;
  onChange: (value: IsoDateRange) => void;
  placeholder?: string;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

/** Popover date-range picker. Emits/accepts plain `yyyy-MM-dd` date strings for query params. */
export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Pick a date range',
  className,
  align = 'start',
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const range: DateRange | undefined = React.useMemo(() => {
    if (!value?.from && !value?.to) return undefined;
    return {
      from: value?.from ? new Date(value.from) : undefined,
      to: value?.to ? new Date(value.to) : undefined,
    };
  }, [value]);

  const label =
    range?.from && range?.to
      ? `${format(range.from, 'MMM d, yyyy')} – ${format(range.to, 'MMM d, yyyy')}`
      : range?.from
        ? format(range.from, 'MMM d, yyyy')
        : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('justify-start text-left font-normal', !range?.from && 'text-muted-foreground', className)}
        >
          <CalendarIcon className="size-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={range}
          defaultMonth={range?.from}
          onSelect={(next) => {
            onChange({
              from: next?.from ? format(next.from, 'yyyy-MM-dd') : undefined,
              to: next?.to ? format(next.to, 'yyyy-MM-dd') : undefined,
            });
          }}
        />
        {range?.from || range?.to ? (
          <div className="flex justify-end border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange({ from: undefined, to: undefined });
                setOpen(false);
              }}
            >
              Clear
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
