'use client';

import { FileIcon, PaperclipIcon, UploadCloudIcon, XIcon } from 'lucide-react';
import * as React from 'react';

import { UPLOAD_RULES, type UploadPurpose } from '@kmg/shared';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn, formatBytes } from '@/lib/utils';

export interface FileDropzoneProps {
  /** Drives the client-side validation rules from `UPLOAD_RULES`. */
  purpose: UploadPurpose;
  value?: File | null;
  onChange: (file: File | null) => void;
  /** Upload progress (0–100) — pass it when you upload with `api.upload`. */
  progress?: number;
  label?: string;
  description?: string;
  disabled?: boolean;
  error?: string | null;
  className?: string;
  id?: string;
}

const EXTENSION_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/webp': 'WEBP',
  'image/gif': 'GIF',
  'image/svg+xml': 'SVG',
};

/** `null` when valid, otherwise a human-readable reason. */
export function validateFile(file: File, purpose: UploadPurpose): string | null {
  const rules = UPLOAD_RULES[purpose];
  if (!rules.mimeTypes.includes(file.type)) {
    return `Unsupported file type. Allowed: ${rules.mimeTypes
      .map((type) => EXTENSION_LABELS[type] ?? type)
      .join(', ')}.`;
  }
  if (file.size > rules.maxBytes) {
    return `File is too large (max ${formatBytes(rules.maxBytes, 0)}).`;
  }
  return null;
}

/**
 * Drag & drop file field with client-side validation mirroring the API's `UPLOAD_RULES`.
 * Controlled — the parent owns the `File` and performs the upload.
 */
export function FileDropzone({
  purpose,
  value,
  onChange,
  progress,
  label,
  description,
  disabled,
  error,
  className,
  id,
}: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const rules = UPLOAD_RULES[purpose];
  const inputId = id ?? `dropzone-${purpose.toLowerCase()}`;

  const accept = rules.mimeTypes.join(',');
  const hint =
    description ??
    `${rules.mimeTypes.map((type) => EXTENSION_LABELS[type] ?? type).join(', ')} · up to ${formatBytes(
      rules.maxBytes,
      0,
    )}`;

  const handleFiles = React.useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      const message = validateFile(file, purpose);
      setLocalError(message);
      onChange(message ? null : file);
    },
    [onChange, purpose],
  );

  const message = error ?? localError;

  return (
    <div className={cn('space-y-2', className)}>
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
      ) : null}

      {value ? (
        <div className="bg-muted/40 flex items-center gap-3 rounded-xl border p-3">
          <span className="bg-background text-muted-foreground grid size-10 shrink-0 place-items-center rounded-lg border">
            <FileIcon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.name}</p>
            <p className="text-muted-foreground text-xs">{formatBytes(value.size)}</p>
            {typeof progress === 'number' && progress > 0 && progress < 100 ? (
              <Progress value={progress} className="mt-2 h-1.5" />
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Remove file"
            disabled={disabled}
            onClick={() => {
              onChange(null);
              setLocalError(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-describedby={`${inputId}-hint`}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (!disabled) handleFiles(event.dataTransfer.files);
          }}
          className={cn(
            'focus-ring flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors',
            dragging ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-500/10' : 'hover:bg-muted/50',
            disabled && 'pointer-events-none opacity-60',
            message && 'border-destructive/50',
          )}
        >
          <span className="bg-muted text-muted-foreground grid size-11 place-items-center rounded-full">
            <UploadCloudIcon className="size-5" aria-hidden />
          </span>
          <p className="text-sm font-medium">
            <span className="text-primary-text dark:text-brand-300">Click to upload</span> or drag and drop
          </p>
          <p id={`${inputId}-hint`} className="text-muted-foreground text-xs">
            {hint}
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => handleFiles(event.target.files)}
      />

      {message ? (
        <p role="alert" className="text-destructive flex items-center gap-1.5 text-sm">
          <PaperclipIcon className="size-3.5" aria-hidden />
          {message}
        </p>
      ) : null}
    </div>
  );
}
