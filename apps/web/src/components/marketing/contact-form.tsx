'use client';

import * as React from 'react';

import { COUNTRIES, contactSchema, dialCodeForCountry, type Service } from '@kmg/shared';

import {
  Form,
  SelectField,
  SubmitButton,
  TextField,
  TextareaField,
  applyApiErrorToForm,
  useZodForm,
} from '@/components/forms';
import { SuccessState } from '@/components/shared/success-state';
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';

const COUNTRY_OPTIONS = COUNTRIES.map((country) => ({ label: country.name, value: country.name }));

export interface ContactFormProps {
  services: Pick<Service, 'slug' | 'title'>[];
}

/** Contact page lead form — Name/Email/Company/Phone/Country/Service/Message + honeypot. */
export function ContactForm({ services }: ContactFormProps) {
  const [submitted, setSubmitted] = React.useState(false);

  const form = useZodForm(contactSchema, {
    defaultValues: {
      name: '',
      email: '',
      company: '',
      phone: '',
      country: '',
      serviceInterest: '',
      message: '',
      source: 'website-contact-form',
      website: '',
    },
  });

  const country = form.watch('country');
  const dialCode = dialCodeForCountry(country) ?? '1';

  async function onSubmit(values: { phone?: string; [key: string]: unknown }) {
    try {
      const phone = values.phone?.trim();
      await api.post('/contact', {
        ...values,
        phone: phone && !phone.startsWith('+') ? `+${dialCode} ${phone}` : phone,
      });
      setSubmitted(true);
    } catch (error) {
      form.setError('root', { message: applyApiErrorToForm(error, form) });
    }
  }

  if (submitted) {
    return (
      <SuccessState
        title="Message sent"
        description="Thanks for reaching out — a member of our team will reply within one business day."
      >
        <Button variant="outline" onClick={() => setSubmitted(false)}>
          Send another message
        </Button>
      </SuccessState>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="name" label="Name" required autoComplete="name" />
          <TextField name="email" label="Email" type="email" required autoComplete="email" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="company" label="Company" autoComplete="organization" />
          <SelectField
            name="country"
            label="Country"
            placeholder="Select a country…"
            options={COUNTRY_OPTIONS}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <div className="flex">
                    <span className="border-input bg-muted text-muted-foreground flex items-center rounded-l-md border border-r-0 px-3 text-sm tabular-nums">
                      +{dialCode}
                    </span>
                    <Input
                      {...field}
                      value={(field.value as string | undefined) ?? ''}
                      type="tel"
                      autoComplete="tel"
                      placeholder="555 123 4567"
                      className="rounded-l-none"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <SelectField
            name="serviceInterest"
            label="Service interested in"
            placeholder="Select a service…"
            options={services.map((service) => ({ label: service.title, value: service.title }))}
          />
        </div>
        <TextareaField name="message" label="Message" required rows={6} maxLength={5000} placeholder="Tell us about your project…" />

        {/* Honeypot — visually hidden (not display:none), unreachable by tab, no autofill. */}
        <div className="absolute h-px w-px overflow-hidden opacity-0" aria-hidden="true">
          <label htmlFor="contact-website">Leave this field blank</label>
          <input id="contact-website" type="text" tabIndex={-1} autoComplete="off" {...form.register('website')} />
        </div>

        {form.formState.errors.root?.message ? (
          <p className="text-destructive text-sm">{form.formState.errors.root.message}</p>
        ) : null}

        <SubmitButton size="lg" pendingLabel="Sending…" className="w-full sm:w-auto">
          Send message
        </SubmitButton>
      </form>
    </Form>
  );
}
