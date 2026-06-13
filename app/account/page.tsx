import { Header } from '@/components/Header';
import { AccountClient } from '@/components/AccountClient';

export default function AccountPage() {
  return (
    <main className="relative min-h-screen">
      <Header />
      <AccountClient />
    </main>
  );
}
