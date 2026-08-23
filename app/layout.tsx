import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import './responsive.css';
import './map.css';
import './search.css';
import './saved.css';
import './alerts.css';
import './profile.css';
import './onboarding.css';
import './legal.css';
import './accessibility.css';
import { brand } from './brand';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline}`,
  description: brand.description,
  applicationName: brand.name,
  manifest: '/manifest.webmanifest',
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: brand.name,
  },
  openGraph: {
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.description,
    images: ['https://raw.githubusercontent.com/ryderearle-blip/DealRadar/main/public/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.description,
    images: ['https://raw.githubusercontent.com/ryderearle-blip/DealRadar/main/public/og.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#069447',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
