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
    <div className="flex min-h-screen">
      <StudentSidebar />
 
      {/*
        pt-14 = clears the 56px (h-14) fixed mobile top bar
        lg:pt-0 = desktop has the sidebar, no top bar, so no padding needed
      */}
      <div className="flex flex-col flex-1 lg:ml-64 min-w-0 pt-14 lg:pt-0">
        <PhoneRequiredBanner />
        <main className="flex-1">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}