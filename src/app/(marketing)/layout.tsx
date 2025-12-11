// src/app/(marketing)/layout.tsx
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-container flex min-h-screen flex-col">
      <Navbar variant="marketing" />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}