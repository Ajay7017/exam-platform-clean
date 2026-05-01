import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ExamEventPopup } from '@/components/marketing/ExamEventPopup'; // ← add

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
      <ExamEventPopup /> {/* ← add at bottom, outside main */}
    </div>
  );
}