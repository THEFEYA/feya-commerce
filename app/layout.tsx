import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/siteConfig';
import { MeasurementRuntime } from '@/components/MeasurementRuntime';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: 'TheFEYA',
    template: '%s | TheFEYA',
  },
  description: 'Handmade stage, festival and performance fashion by TheFEYA.',
  // Fail closed globally. Only an ACTIVE immutable search release may opt a page into indexing.
  robots: { index: false, follow: true, nocache: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><MeasurementRuntime />{children}</body>
    </html>
  );
}
