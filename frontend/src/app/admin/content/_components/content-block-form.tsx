'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDownIcon, RotateCcwIcon } from 'lucide-react';
import * as React from 'react';
import { useForm, type FieldValues } from 'react-hook-form';
import { toast } from 'sonner';

import { CONTENT_BLOCK_META, CONTENT_BLOCK_SCHEMAS, DEFAULT_CONTENT_BLOCKS, type ContentBlockKey } from '@kmg/shared';

import {
  Form,
  ListInput,
  SubmitButton,
  TextareaField,
  TextField,
  applyApiErrorToForm,
} from '@/components/forms';
import { ConfirmDialog } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { api, errorMessage } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { Can } from '@/lib/auth';
import { revalidatePublicSite } from '@/lib/revalidate';
import { formatDate } from '@/lib/utils';

import { ArrayObjectField, TextareaListField } from './array-object-field';
import { CONTENT_BLOCK_FORM_CONFIG, type FieldConfig } from '../_form-config';
import type { ContentBlockRecord } from '../_lib';

// Field components are typed generically over the caller's form-value shape; content-block
// forms are driven by a runtime config (`CONTENT_BLOCK_FORM_CONFIG`) rather than a single
// static schema, so every field is bound to the loose `FieldValues` shape instead.
const AnyTextField = TextField<FieldValues>;
const AnyTextareaField = TextareaField<FieldValues>;
const AnyListInput = ListInput<FieldValues>;
const AnyTextareaListField = TextareaListField<FieldValues>;
const AnyArrayObjectField = ArrayObjectField<FieldValues>;

function renderField(field: FieldConfig) {
  switch (field.kind) {
    case 'text':
      return <AnyTextField key={field.name} name={field.name} label={field.label} placeholder={field.placeholder} />;
    case 'textarea':
      return (
        <AnyTextareaField
          key={field.name}
          name={field.name}
          label={field.label}
          rows={field.rows}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
        />
      );
    case 'stringList':
      return (
        <AnyListInput
          key={field.name}
          name={field.name}
          label={field.label}
          addLabel={field.addLabel}
          placeholder={field.placeholder}
          description={field.description}
        />
      );
    case 'paragraphList':
      return (
        <AnyTextareaListField
          key={field.name}
          name={field.name}
          label={field.label}
          addLabel={field.addLabel}
          description={field.description}
        />
      );
    case 'arrayObject':
      return (
        <AnyArrayObjectField
          key={field.name}
          name={field.name}
          label={field.label}
          columns={field.columns}
          emptyRow={field.emptyRow}
          addLabel={field.addLabel}
          description={field.description}
        />
      );
    default:
      return null;
  }
}

export interface ContentBlockFormProps {
  blockKey: ContentBlockKey;
  record: ContentBlockRecord;
}

/** Real, labeled form for a single content block — driven by `CONTENT_BLOCK_FORM_CONFIG`. */
export function ContentBlockForm({ blockKey, record }: ContentBlockFormProps) {
  const queryClient = useQueryClient();
  const groups = CONTENT_BLOCK_FORM_CONFIG[blockKey];
  const meta = CONTENT_BLOCK_META[blockKey];
  const [showDefault, setShowDefault] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  const form = useForm<FieldValues>({
    // Schema is selected at runtime by `blockKey`, so the resolver's static type can't be known here.
    resolver: zodResolver(CONTENT_BLOCK_SCHEMAS[blockKey] as never) as never,
    mode: 'onTouched',
    defaultValues: record.data as FieldValues,
  });

  async function onSubmit(values: FieldValues) {
    try {
      await api.put(`/admin/content-blocks/${blockKey}`, values);
      toast.success(`${meta.label} updated`);
      form.reset(values);
      queryClient.invalidateQueries({ queryKey: qk.admin.contentBlocks.list });
      queryClient.invalidateQueries({ queryKey: qk.admin.contentBlocks.detail(blockKey) });
      revalidatePublicSite('content-blocks');
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    }
  }

  async function onReset() {
    try {
      setResetting(true);
      await api.post(`/admin/content-blocks/${blockKey}/reset`);
      const defaults = DEFAULT_CONTENT_BLOCKS[blockKey] as FieldValues;
      form.reset(defaults);
      toast.success(`${meta.label} reset to default`);
      queryClient.invalidateQueries({ queryKey: qk.admin.contentBlocks.list });
      queryClient.invalidateQueries({ queryKey: qk.admin.contentBlocks.detail(blockKey) });
      revalidatePublicSite('content-blocks');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setResetting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <p className="text-muted-foreground text-sm">
              {record.updatedAt ? (
                <>Last updated {formatDate(record.updatedAt, 'long')}</>
              ) : (
                'Not customized yet — the public site is showing the default copy below.'
              )}
            </p>
            <Can permission="content:write">
              <ConfirmDialog
                trigger={
                  <Button type="button" variant="outline" size="sm" disabled={resetting}>
                    <RotateCcwIcon className="size-4" /> Reset to default
                  </Button>
                }
                title={`Reset "${meta.label}" to its default content?`}
                description="This discards any customization and immediately restores the built-in copy on the public site. This cannot be undone."
                variant="destructive"
                confirmLabel="Reset"
                onConfirm={onReset}
              />
            </Can>
          </CardContent>
        </Card>

        {groups.map((group) => (
          <Card key={group.title}>
            <CardHeader>
              <CardTitle>{group.title}</CardTitle>
              {group.description ? <CardDescription>{group.description}</CardDescription> : null}
            </CardHeader>
            <CardContent className="space-y-5">{group.fields.map(renderField)}</CardContent>
          </Card>
        ))}

        <Collapsible open={showDefault} onOpenChange={setShowDefault}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="hover:bg-muted/50 cursor-pointer flex-row items-center justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-sm">Default value</CardTitle>
                  <CardDescription>What the public site falls back to if this block is never customized.</CardDescription>
                </div>
                <ChevronDownIcon className={`size-4 shrink-0 transition-transform ${showDefault ? 'rotate-180' : ''}`} aria-hidden />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-xs leading-relaxed">
                  {JSON.stringify(DEFAULT_CONTENT_BLOCKS[blockKey], null, 2)}
                </pre>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Can permission="content:write">
          <div className="flex justify-end">
            <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
          </div>
        </Can>
      </form>
    </Form>
  );
}
