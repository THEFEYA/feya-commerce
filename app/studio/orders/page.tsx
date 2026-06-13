import { Header } from '@/components/Header';
import { AtelierOrdersClient } from '@/components/AtelierOrdersClient';

export default function StudioOrdersPage() {
  return (
    <main className="relative min-h-screen">
      <Header />
      <AtelierOrdersClient />
    </main>
  );
}
