// src/app/(admin)/layout.tsx

import { Navbar } from '@/components/layout/Navbar';
import { AdminSidebar } from '@/components/layout/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="admin" />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 bg-gray-50 lg:ml-64">
          <div className="container mx-auto p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
