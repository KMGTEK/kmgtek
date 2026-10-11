import { ImageResponse } from 'next/og';

import { COMPANY } from '@kmg/shared';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

/** Default OpenGraph/Twitter card. Individual routes override this by exporting their own. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background: '#0b0b0f',
          backgroundImage:
            'radial-gradient(circle at 8% 15%, rgba(243,156,44,0.35), transparent 45%), radial-gradient(circle at 92% 85%, rgba(229,49,47,0.3), transparent 45%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: '#f39c2c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 800,
              color: '#ffffff',
            }}
          >
            K
          </div>
          <div style={{ color: '#f39c2c', fontSize: 26, fontWeight: 700, letterSpacing: 2 }}>
            {COMPANY.displayName.toUpperCase()}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 980 }}>
          <div style={{ display: 'flex', color: '#ffffff', fontSize: 54, fontWeight: 700, lineHeight: 1.15 }}>
            {COMPANY.tagline}
          </div>
          <div style={{ display: 'flex', color: '#a8a49d', fontSize: 24, lineHeight: 1.5 }}>
            {truncate(COMPANY.description, 160)}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
