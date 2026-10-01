import type { Metadata } from 'next';
import {Suspense} from 'react';
import {connection} from 'next/server';
import { getSiteUrl } from '@/lib/siteConfig';
import { MeasurementRuntime } from '@/components/MeasurementRuntime';
import { AnalyticsConsentBanner } from '@/components/AnalyticsConsentBanner';
import { publicLegalIdentityReady } from '@/lib/publicLegalIdentity';
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

async function SearchReleaseRuntimeMarker(){
  // Search Release activation is mutable runtime governance. This null marker
  // gives release-aware generateMetadata() a request-time boundary while Cache
  // Components can continue prerendering the visible storefront shell.
  await connection();
  return null;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const analyticsConsentReady=publicLegalIdentityReady()
    && process.env.FEYA_ANALYTICS_PRIVACY_READY==='true'
    && process.env.FEYA_ANALYTICS_ENABLED==='true';

  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}><SearchReleaseRuntimeMarker /></Suspense>
        <Suspense fallback={null}><MeasurementRuntime /></Suspense>
        <AnalyticsConsentBanner enabled={analyticsConsentReady} />
        {children}
      </body>
    </html>
  );
}
