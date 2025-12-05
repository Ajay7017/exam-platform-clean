// src/components/layout/StudentSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Award,
  User,
  Clock,
  ChevronRight,
  LogOut,
  ShoppingBag,
} from 'lucide-react';

export function StudentSidebar() {
  const pathname = usePathname();

  const navGroups = [
    {
      title: 'Main',
      items: [
        {
          label: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
        },
        {
          label: 'Browse Exams',
          href: '/exams',
          icon: BookOpen,
        },
        {
          label: 'My Results',
          href: '/results',
          icon: Trophy,
        },
        {
          label: 'My Purchases',
          href: '/purchases',
          icon: ShoppingBag,
        },
      ],
    },
    {
      title: 'Other',
      items: [
        {
          label: 'Leaderboard',
          href: '/leaderboard',
          icon: Award,
        },
        {
          label: 'Practice History',
          href: '/history',
          icon: Clock,
        },
        {
          label: 'Profile',
          href: '/profile',
          icon: User,
        },
      ],
    },
  ];

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <aside className="fixed left-0 top-16 hidden h-[calc(100vh-4rem)] w-64 border-r bg-white lg:block">
      <div className="flex h-full flex-col overflow-y-auto p-4">
        <nav className="flex-1 space-y-6">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              {group.title && (
                <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {group.title}
                </h3>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {isActive && (
                          <ChevronRight className="h-4 w-4 shrink-0 text-primary-500" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Logout Button at Bottom */}
        <div className="pt-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700 hover:bg-red-50 hover:text-red-600"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        </div>
      </div>
    </aside>
  );
}