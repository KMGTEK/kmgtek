'use client';

import * as React from 'react';

/** Copy text to the clipboard and flash a "copied" state for `timeout` ms. */
export function useCopy(timeout = 2000) {
  const [copied, setCopied] = React.useState(false);

  const copy = React.useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), timeout);
        return true;
      } catch {
        return false;
      }
    },
    [timeout],
  );

  return { copied, copy };
}
