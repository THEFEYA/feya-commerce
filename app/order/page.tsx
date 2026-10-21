export const instant = false;

import type {Metadata} from 'next';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {OrderReceiptClient} from '@/components/checkout/OrderReceiptClient';

export const metadata: Metadata = {
  title: 'Your order | TheFEYA',
  robots: {index: false, follow: false, nocache: true},
  referrer: 'no-referrer',
};

export default function OrderPage() {
  return <main className="visual-commerce-shell relative min-h-screen">
    <Header/>
    <OrderReceiptClient/>
    <Footer/>
  </main>;
}
