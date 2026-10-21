export const instant = false;

import type {Metadata} from 'next';
import {Suspense} from 'react';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {CheckoutReturnClient} from '@/components/checkout/CheckoutReturnClient';

export const metadata: Metadata = {
  title: 'Payment | TheFEYA',
  robots: {index: false, follow: false, nocache: true},
  referrer: 'no-referrer',
};

export default function CheckoutReturnPage() {
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <Suspense fallback={null}><CheckoutReturnClient/></Suspense>
    <Footer/>
  </main>;
}
