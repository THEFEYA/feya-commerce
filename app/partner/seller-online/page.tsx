import type {Metadata} from 'next';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {SellerOnlinePartnerSetupClient} from '@/components/SellerOnlinePartnerSetupClient';

export const metadata:Metadata={
  title:'Seller Online · Payment setup | TheFEYA',
  description:'Private, invited Seller Online payment integration setup for TheFEYA.',
  robots:{index:false,follow:false,nocache:true,noarchive:true},
  referrer:'no-referrer',
};

export default function Page(){
 return <main className="visual-commerce-shell min-h-screen">
   <Header/>
   <section className="container-feya pt-28 pb-10 lg:pt-40">
     <p className="eyebrow-gold mb-4">TheFEYA · Partner integration</p>
     <h1 className="visual-display max-w-4xl text-[clamp(34px,5vw,66px)] leading-[1.05] text-[#f7f3ec]">
       Seller Online · Payment setup
     </h1>
     <p className="mt-5 max-w-3xl text-[14px] leading-7 text-[var(--bone-dim)]">
       Специальная панель для технической команды Seller Online. Выберите доступный способ оплаты,
       внесите свои данные и сохраните их на сервере без отправки владельцу сайта.
       Вход осуществляется по персональной ссылке — пароль TheFEYA не нужен.
     </p>
     <p className="mt-3 max-w-3xl text-[12px] leading-6 text-[#d4b26a]">
       Реальные платежи и создание заказов пока выключены. Сохранение параметров не запускает оплату автоматически.
     </p>
   </section>
   <section className="container-feya pb-20 lg:pb-24">
     <SellerOnlinePartnerSetupClient/>
   </section>
   <Footer/>
 </main>;
}
