import type { MetadataRoute } from 'next';

import { COMPANY } from '@kmg/shared';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: COMPANY.displayName,
    short_name: COMPANY.shortName,
    description: COMPANY.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#f39c2c',
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
      { src: '/logo-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
