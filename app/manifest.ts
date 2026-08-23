import type { MetadataRoute } from 'next';
import { brand } from './brand';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name} — ${brand.tagline}`,
    short_name: brand.name,
    description: brand.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#069447',
    orientation: 'portrait-primary',
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
