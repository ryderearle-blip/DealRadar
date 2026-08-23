import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DealRadar — Find it cheaper. Find it closer.',
    short_name: 'DealRadar',
    description: 'Compare verified local and online retailer prices with real U.S. store locations.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#069447',
    orientation: 'portrait-primary',
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
