import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Apple touch icon — same mark as `icon.tsx`, scaled up with the bar-chart accent. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: '#f39c2c',
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize: 108,
            fontWeight: 800,
            fontFamily: 'system-ui, sans-serif',
            lineHeight: 1,
          }}
        >
          K
        </span>
        <div style={{ position: 'absolute', right: 30, bottom: 26, display: 'flex', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ width: 10, height: 30, background: '#ffffff', borderRadius: 2 }} />
          <div style={{ width: 10, height: 48, background: '#e5312f', borderRadius: 2 }} />
        </div>
      </div>
    ),
    size,
  );
}
