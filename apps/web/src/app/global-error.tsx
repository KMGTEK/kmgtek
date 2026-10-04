'use client';

import * as React from 'react';

/**
 * Catches errors thrown by the root layout itself (fonts, providers, `<html>`/`<body>`).
 * Since it replaces the root layout, it must render its own full document — it cannot
 * rely on `globals.css`, brand components or `next/font`, all of which live under the
 * layout this boundary is standing in for.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error('[web] root layout error', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100svh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          background: '#0b0b0f',
          color: '#f6f5f3',
        }}
      >
        <div style={{ maxWidth: 440, textAlign: 'center' }}>
          <div
            aria-hidden
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#f39c2c',
              margin: '0 auto 24px',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: 24,
              color: '#0b0b0f',
            }}
          >
            K
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 12px' }}>The app failed to load</h1>
          <p style={{ color: '#a8a49d', lineHeight: 1.6, margin: '0 0 24px' }}>
            Something went wrong before the page could render. Reloading usually fixes it.
          </p>
          {error.digest ? (
            <p style={{ color: '#726e67', fontSize: 12, margin: '0 0 24px' }}>Reference: {error.digest}</p>
          ) : null}
          <button
            onClick={() => reset()}
            style={{
              background: '#f39c2c',
              color: '#14100a',
              border: 'none',
              borderRadius: 10,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
