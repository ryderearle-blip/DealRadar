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

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'DealRadar — Find it cheaper. Find it closer.',
  description: 'Compare local and online prices, availability, and distance in one search.',
  applicationName: 'DealRadar',
  manifest: '/manifest.webmanifest',
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DealRadar',
  },
  openGraph: {
    title: 'DealRadar — Find it cheaper. Find it closer.',
    description: 'Compare local and online prices, availability, and distance in one search.',
    images: ['https://raw.githubusercontent.com/ryderearle-blip/DealRadar/main/public/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DealRadar — Find it cheaper. Find it closer.',
    description: 'Compare local and online prices, availability, and distance in one search.',
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
