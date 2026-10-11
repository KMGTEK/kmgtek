import { tokenStore } from '@/lib/auth/token-store';
import { API_BASE_PATH } from '@/lib/env';

/**
 * Resolve an authenticated 302-redirect-to-signed-URL endpoint (e.g. the resume download
 * route) to its final URL, so it can be opened in a new tab or set as a download link —
 * a plain `<a href>` can't carry the `Authorization` bearer header these routes require.
 */
export async function resolveFileUrl(path: string): Promise<string> {
  const token = tokenStore.get();
  const response = await fetch(`${API_BASE_PATH}${path}`, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new Error('Could not load the file.');
  return response.url;
}
