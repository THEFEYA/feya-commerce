export const instant = false;

import type {Metadata} from 'next';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {SellerOnlineInstallClient} from '@/components/payments/SellerOnlineInstallClient';

export const metadata: Metadata = {
  title: 'Seller Online · Payment connection | TheFEYA',
  description: 'Private, invitation-only installation of the Seller Online payment connection for TheFEYA.',
  robots: {index: false, follow: false, nocache: true, noarchive: true},
  referrer: 'no-referrer',
};

export default function SellerOnlinePartnerPage() {
  return <main className="visual-commerce-shell min-h-screen">
    <Header/>
    <section className="container-feya pt-28 pb-8 lg:pt-36">
      <p className="eyebrow-gold mb-4">TheFEYA × Seller Online</p>
      <h1 className="visual-display max-w-4xl text-[clamp(32px,4.6vw,58px)] leading-[1.05] text-[#f7f3ec]">
        Подключение оплаты
      </h1>
      <p className="mt-5 max-w-3xl text-[14px] leading-7 text-[var(--bone-dim)]">
        Как платёжное приложение в Shopify: подключите PayPal-аккаунт Seller Online, и система сама проверит его,
        установит уведомления PayPal, проведёт тестовый платёж и включит оплату на thefeya.com.
        Ключи сохраняются только на сервере в зашифрованном виде — владелец сайта их не видит.
      </p>
    </section>
    <section className="container-feya pb-20 lg:pb-24">
      <SellerOnlineInstallClient/>
    </section>
    <Footer/>
  </main>;
}
