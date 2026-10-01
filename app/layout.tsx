import type { Metadata } from 'next';
import { Cormorant_Garamond, Italiana, Manrope } from 'next/font/google';
import {Suspense} from 'react';
import { getSiteUrl } from '@/lib/siteConfig';
import { MeasurementRuntime } from '@/components/MeasurementRuntime';
import { AnalyticsConsentBanner } from '@/components/AnalyticsConsentBanner';
import { publicLegalIdentityReady } from '@/lib/publicLegalIdentity';
import './globals.css';

const manrope=Manrope({
  subsets:['latin'],
  weight:['300','400','500','600','700'],
  variable:'--font-manrope',
  display:'swap',
});

const cormorant=Cormorant_Garamond({
  subsets:['latin'],
  weight:['300','400','500','600'],
  style:'normal',
  variable:'--font-cormorant',
  display:'swap',
  preload:false,
});

const italiana=Italiana({
  subsets:['latin'],
  weight:'400',
  variable:'--font-italiana',
  display:'swap',
});


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
  const analyticsConsentReady=publicLegalIdentityReady()
    && process.env.FEYA_ANALYTICS_PRIVACY_READY==='true'
    && process.env.FEYA_ANALYTICS_ENABLED==='true';

  return (
    <html lang="en" className={`${manrope.variable} ${cormorant.variable} ${italiana.variable}`}>
      <body>
        <Suspense fallback={null}><MeasurementRuntime /></Suspense>
        <AnalyticsConsentBanner enabled={analyticsConsentReady} />
        {children}
      </body>
    </html>
  );
}
