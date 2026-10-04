'use client';

import * as React from 'react';

/** Debounce a fast-changing value (search inputs, filters). */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/** Debounce a callback. The returned function keeps a stable identity. */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay = 300,
) {
  const callbackRef = React.useRef(callback);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the ref fresh without mutating it during render (`react-hooks/refs`).
  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return React.useCallback(
    (...args: Args) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => callbackRef.current(...args), delay);
    },
    [delay],
  );
}
