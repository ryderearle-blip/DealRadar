const primary = process.env.NEXT_PUBLIC_BRAND_PRIMARY?.trim() || 'Deal';
const accent = process.env.NEXT_PUBLIC_BRAND_ACCENT?.trim() || 'Radar';

export const brand = {
  primary,
  accent,
  name: `${primary}${accent}`,
  tagline: 'Find it cheaper. Find it closer.',
  description: 'Compare verified local and online retailer prices with real U.S. store locations.',
} as const;
