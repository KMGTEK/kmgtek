'use client';

import { Loader2Icon } from 'lucide-react';
import * as React from 'react';
import { useFormContext, type FieldPath, type FieldValues } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/**
 * Field components for `react-hook-form`. They read the form from context, so wrap the
 * form in shadcn's `<Form {...form}>` provider:
 *
 * ```tsx
 * <Form {...form}>
 *   <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
 *     <TextField name="email" label="Work email" type="email" required />
 *     <SubmitButton>Send</SubmitButton>
 *   </form>
 * </Form>
 * ```
 */

interface BaseFieldProps<TValues extends FieldValues> {
  name: FieldPath<TValues>;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

function FieldLabel({ label, required }: { label?: string; required?: boolean }) {
  if (!label) return null;
  return (
    <FormLabel>
      {label}
      {required ? (
        <span className="text-destructive" aria-hidden>
          *
        </span>
      ) : null}
    </FormLabel>
  );
}

/* ------------------------------- Text ---------------------------------- */

export interface TextFieldProps<TValues extends FieldValues> extends BaseFieldProps<TValues> {
  type?: React.HTMLInputTypeAttribute;
  autoComplete?: string;
  inputMode?: React.ComponentProps<'input'>['inputMode'];
  /** Icon or button rendered inside the field, on the right. */
  suffix?: React.ReactNode;
}

export function TextField<TValues extends FieldValues>({
  name,
  label,
  description,
  placeholder,
  required,
  disabled,
  className,
  type = 'text',
  autoComplete,
  inputMode,
  suffix,
}: TextFieldProps<TValues>) {
  const form = useFormContext<TValues>();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FieldLabel label={label} required={required} />
          <FormControl>
            <div className="relative">
              <Input
                {...field}
                value={(field.value as string | number | undefined) ?? ''}
                type={type}
                inputMode={inputMode}
                autoComplete={autoComplete}
                placeholder={placeholder}
                disabled={disabled || form.formState.isSubmitting}
                className={cn(suffix && 'pr-10')}
              />
              {suffix ? (
                <span className="absolute top-1/2 right-2 -translate-y-1/2">{suffix}</span>
              ) : null}
            </div>
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/* ----------------------------- Textarea -------------------------------- */

export function TextareaField<TValues extends FieldValues>({
  name,
  label,
  description,
  placeholder,
  required,
  disabled,
  className,
  rows = 5,
  maxLength,
}: BaseFieldProps<TValues> & { rows?: number; maxLength?: number }) {
  const form = useFormContext<TValues>();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const value = (field.value as string | undefined) ?? '';
        return (
          <FormItem className={className}>
            <FieldLabel label={label} required={required} />
            <FormControl>
              <Textarea
                {...field}
                value={value}
                rows={rows}
                maxLength={maxLength}
                placeholder={placeholder}
                disabled={disabled || form.formState.isSubmitting}
              />
            </FormControl>
            <div className="flex items-center justify-between gap-3">
              {description ? <FormDescription>{description}</FormDescription> : <span />}
              {maxLength ? (
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {value.length}/{maxLength}
                </span>
              ) : null}
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

/* ------------------------------- Select -------------------------------- */

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export function SelectField<TValues extends FieldValues>({
  name,
  label,
  description,
  placeholder = 'Select…',
  required,
  disabled,
  className,
  options,
}: BaseFieldProps<TValues> & { options: SelectOption[] }) {
  const form = useFormContext<TValues>();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FieldLabel label={label} required={required} />
          <Select
            value={(field.value as string | undefined) ?? ''}
            onValueChange={field.onChange}
            disabled={disabled || form.formState.isSubmitting}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/* ------------------------------ Checkbox -------------------------------- */

export function CheckboxField<TValues extends FieldValues>({
  name,
  label,
  description,
  disabled,
  className,
  children,
}: Omit<BaseFieldProps<TValues>, 'placeholder'> & { children?: React.ReactNode }) {
  const form = useFormContext<TValues>();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('flex flex-row items-start gap-3 space-y-0', className)}>
          <FormControl>
            <Checkbox
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
              disabled={disabled || form.formState.isSubmitting}
              className="mt-0.5"
            />
          </FormControl>
          <div className="space-y-1 leading-snug">
            {label ? <FormLabel className="font-normal">{label}</FormLabel> : null}
            {children}
            {description ? <FormDescription>{description}</FormDescription> : null}
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}

/* ------------------------------- Switch --------------------------------- */

export function SwitchField<TValues extends FieldValues>({
  name,
  label,
  description,
  disabled,
  className,
}: Omit<BaseFieldProps<TValues>, 'placeholder'>) {
  const form = useFormContext<TValues>();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn('flex flex-row items-center justify-between gap-4 rounded-lg border p-4', className)}
        >
          <div className="space-y-0.5">
            {label ? <FormLabel>{label}</FormLabel> : null}
            {description ? <FormDescription>{description}</FormDescription> : null}
          </div>
          <FormControl>
            <Switch
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
              disabled={disabled || form.formState.isSubmitting}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

/* ------------------------------ Radio group ----------------------------- */

export function RadioField<TValues extends FieldValues>({
  name,
  label,
  description,
  required,
  disabled,
  className,
  options,
  orientation = 'vertical',
}: BaseFieldProps<TValues> & { options: SelectOption[]; orientation?: 'vertical' | 'horizontal' }) {
  const form = useFormContext<TValues>();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FieldLabel label={label} required={required} />
          <FormControl>
            <RadioGroup
              value={(field.value as string | undefined) ?? ''}
              onValueChange={field.onChange}
              disabled={disabled || form.formState.isSubmitting}
              className={cn(orientation === 'horizontal' && 'flex flex-wrap gap-6')}
            >
              {options.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
                  <label htmlFor={`${name}-${option.value}`} className="text-sm">
                    {option.label}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/* ------------------------------ Submit ---------------------------------- */

export function SubmitButton({
  children,
  className,
  pendingLabel,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const form = useFormContext();
  const pending = form?.formState.isSubmitting ?? false;
  return (
    <Button type="submit" disabled={pending} className={className} {...props}>
      {pending ? <Loader2Icon className="size-4 animate-spin" aria-hidden /> : null}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}
