import type { Metadata } from 'next';
import { getSiteUrl, isSearchIndexingEnabled } from '@/lib/siteConfig';
import './globals.css';

const searchIndexingEnabled = isSearchIndexingEnabled();

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: 'TheFEYA',
    template: '%s | TheFEYA',
  },
  description: 'Handmade stage, festival and performance fashion by TheFEYA.',
  robots: searchIndexingEnabled
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
