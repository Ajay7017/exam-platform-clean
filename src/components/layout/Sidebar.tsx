// src/components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NavGroup } from '@/types/navigation';
import { ChevronRight } from 'lucide-react';

interface SidebarProps {
  navGroups: NavGroup[];
}

export function Sidebar({ navGroups }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-16 hidden h-[calc(100vh-4rem)] w-64 border-r bg-white lg:block">
      <div className="flex h-full flex-col overflow-y-auto p-4">
        <nav className="space-y-6">
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
                        {Icon && <Icon className="h-5 w-5 shrink-0" />}
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="rounded-full bg-primary-500 px-2 py-0.5 text-xs font-semibold text-white">
                            {item.badge}
                          </span>
                        )}
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
      </div>
    </aside>
  );
}