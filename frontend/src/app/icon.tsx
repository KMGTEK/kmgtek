import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/**
 * Favicon, derived from `public/logo-mark.svg` (orange rounded square, white "K",
 * dark bar-chart accent) but simplified to a single glyph — the full mark is
 * illegible at 32px.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f39c2c',
          borderRadius: 7,
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize: 22,
            fontWeight: 800,
            fontFamily: 'system-ui, sans-serif',
            lineHeight: 1,
          }}
        >
          K
        </span>
      </div>
    ),
    size,
  );
}
