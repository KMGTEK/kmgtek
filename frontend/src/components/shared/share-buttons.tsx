'use client';

import { CheckIcon, LinkIcon, MailIcon } from 'lucide-react';
import { toast } from 'sonner';
import * as React from 'react';

import { SocialIcon } from '@/components/brand/social-icons';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCopy } from '@/hooks/use-copy';
import { absoluteUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';

export interface ShareButtonsProps {
  /** Path (`/blog/my-post`) or absolute URL. */
  url: string;
  title: string;
  /** Extra text used by the email share. */
  summary?: string;
  className?: string;
  size?: 'sm' | 'default';
}

/** LinkedIn / X / Facebook / email / copy-link row for posts, jobs and case studies. */
export function ShareButtons({ url, title, summary, className, size = 'sm' }: ShareButtonsProps) {
  const shareUrl = url.startsWith('http') ? url : absoluteUrl(url);
  const { copied, copy } = useCopy();

  const targets = [
    {
      key: 'linkedin' as const,
      label: 'Share on LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
    {
      key: 'twitter' as const,
      label: 'Share on X',
      href: `https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`,
    },
    {
      key: 'facebook' as const,
      label: 'Share on Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
  ];

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {targets.map((target) => (
        <Tooltip key={target.key}>
          <TooltipTrigger asChild>
            <Button variant="outline" size={size === 'sm' ? 'icon-sm' : 'icon'} asChild>
              <a href={target.href} target="_blank" rel="noopener noreferrer" aria-label={target.label}>
                <SocialIcon name={target.key} />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{target.label}</TooltipContent>
        </Tooltip>
      ))}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size={size === 'sm' ? 'icon-sm' : 'icon'} asChild>
            <a
              href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(
                `${summary ? `${summary}\n\n` : ''}${shareUrl}`,
              )}`}
              aria-label="Share by email"
            >
              <MailIcon className="size-4" />
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Share by email</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size={size === 'sm' ? 'icon-sm' : 'icon'}
            aria-label="Copy link"
            onClick={async () => {
              const ok = await copy(shareUrl);
              toast[ok ? 'success' : 'error'](ok ? 'Link copied to clipboard' : 'Could not copy the link');
            }}
          >
            {copied ? <CheckIcon className="size-4" /> : <LinkIcon className="size-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copied ? 'Copied!' : 'Copy link'}</TooltipContent>
      </Tooltip>
    </div>
  );
}
