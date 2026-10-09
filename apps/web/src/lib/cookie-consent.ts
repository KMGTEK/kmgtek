import * as React from 'react';

export type CookieConsent = 'accepted' | 'declined';

const STORAGE_KEY = 'kmg_cookie_consent';
const CHANGE_EVENT = 'kmg:cookie-consent';

// Fallback for browsers where localStorage throws (e.g. blocked storage), so the banner still closes.
let memoryChoice: CookieConsent | null = null;

function read(): CookieConsent | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'accepted' || value === 'declined' ? value : null;
  } catch {
    return memoryChoice;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function setCookieConsent(value: CookieConsent): void {
  memoryChoice = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // memoryChoice covers this session
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Forget the stored choice so the banner is shown again. */
export function resetCookieConsent(): void {
  memoryChoice = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing stored
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** `undefined` while rendering on the server / hydrating, then the stored choice or `null` if none yet. */
export function useCookieConsent(): CookieConsent | null | undefined {
  return React.useSyncExternalStore<CookieConsent | null | undefined>(subscribe, read, () => undefined);
}
