// src/app/(student)/layout.tsx
import { Navbar } from '@/components/layout/Navbar';
import { StudentSidebar } from '@/components/layout/StudentSidebar';
import { PhoneRequiredBanner } from '@/components/layout/PhoneRequiredBanner';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="student" />
      <PhoneRequiredBanner />
      <div className="flex flex-1">
        <StudentSidebar />
        <main className="flex-1 lg:ml-64">
          <div className="container mx-auto p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}