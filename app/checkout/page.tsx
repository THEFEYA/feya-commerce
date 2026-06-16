import { Header } from '@/components/Header';
import { CheckoutClient } from '@/components/CheckoutClient';

export default function CheckoutPage() {
  return (
    <main className="relative min-h-screen">
      <Header />
      <CheckoutClient />
    </main>
  );
}
