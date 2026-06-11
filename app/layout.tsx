import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FEYA Commerce',
  description: 'Independent commerce system for TheFEYA.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
