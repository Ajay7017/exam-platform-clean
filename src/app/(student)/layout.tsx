// src/app/(student)/layout.tsx
import { Navbar } from '@/components/layout/Navbar';
import { StudentSidebar } from '@/components/layout/StudentSidebar';
import { PhoneRequiredBanner } from '@/components/layout/PhoneRequiredBanner';
import { FeedbackNotificationPopup } from '@/components/student/FeedbackNotificationPopup';

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
        <main className="flex-1 lg:ml-64 min-w-0">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
      <FeedbackNotificationPopup />
    </div>
  );
}