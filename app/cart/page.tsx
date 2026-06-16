import { Header } from '@/components/Header';
import { CartClient } from '@/components/CartClient';

export default function CartPage() {
  return (
    <main className="relative min-h-screen">
      <Header />
      <CartClient />
    </main>
  );
}
