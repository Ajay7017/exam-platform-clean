// src/components/layout/AdminSidebar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  LayoutDashboard,
  BookOpen,
  FileQuestion,
  Users,
  BarChart3,
  Settings,
  FolderTree,
  ChevronRight,
  List,
  Layers,
  ClipboardList,
  MessageSquare,
  Package,
  LogOut,
  Zap,
  Menu,
} from 'lucide-react';

const navGroups = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, color: 'text-blue-400' },
      { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, color: 'text-violet-400' },
    ],
  },
  {
    title: 'Content Management',
    items: [
      { label: 'Subjects',        href: '/admin/subjects',   icon: FolderTree,    color: 'text-cyan-400' },
      { label: 'Topics',          href: '/admin/topics',     icon: List,          color: 'text-teal-400' },
      { label: 'SubTopics',       href: '/admin/subtopics',  icon: Layers,        color: 'text-emerald-400' },
      { label: 'Question Bank',   href: '/admin/questions',  icon: FileQuestion,  color: 'text-amber-400' },
      { label: 'Exam Management', href: '/admin/exams',      icon: ClipboardList, color: 'text-orange-400' },
      { label: 'Bundles',         href: '/admin/bundles',    icon: Package,       color: 'text-pink-400' },
      { label: 'Study Materials', href: '/admin/materials',  icon: BookOpen,      color: 'text-indigo-400' },
    ],
  },
  {
    title: 'Users',
    items: [
      { label: 'User Management',    href: '/admin/users',    icon: Users,         color: 'text-slate-400' },
      { label: 'Feedback & Reports', href: '/admin/feedback', icon: MessageSquare, color: 'text-rose-400' },
    ],
  },
  // {
  //   title: 'System',
  //   items: [
  //     { label: 'Settings', href: '/admin/settings', icon: Settings, color: 'text-gray-400' },
  //   ],
  // },
];

// ── Shared nav content ────────────────────────────────────────────────────

function NavContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-none">
        {navGroups.map((group, idx) => (
          <div key={idx}>
            <p
              className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.25)' }}
            >
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/admin/dashboard' &&
                    pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group',
                        isActive
                          ? 'text-white'
                          : 'text-white/60 hover:text-white/90'
                      )}
                      style={
                        isActive
                          ? {
                              background: `linear-gradient(135deg, ${getActiveBgColor(item.color)})`,
                              boxShadow: `0 2px 12px ${getGlowColor(item.color)}`,
                            }
                          : {}
                      }
                    >
                      {isActive && (
                        <div
                          className={cn(
                            'absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full',
                            getBarColor(item.color)
                          )}
                        />
                      )}
                      {!isActive && (
                        <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/[0.04] transition-colors duration-200" />
                      )}
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-all duration-200',
                          isActive
                            ? item.color
                            : 'text-white/50 group-hover:text-white/80'
                        )}
                      />
                      <span className="flex-1 relative z-10">{item.label}</span>
                      {isActive && (
                        <ChevronRight
                          className={cn('h-3.5 w-3.5 shrink-0', item.color)}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="px-3 py-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/30 hover:text-red-400 hover:bg-red-500/[0.08] transition-all duration-200 group"
        >
          <LogOut className="h-4 w-4 shrink-0 group-hover:text-red-400 transition-colors" />
          <span>Logout</span>
        </button>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const sidebarStyle = {
    background:
      'linear-gradient(180deg, #0f172a 0%, #0c1426 50%, #0a1020 100%)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
  };

  return (
    <>
      {/* ── DESKTOP sidebar (unchanged) ──────────────────────────────── */}
      <aside
        className="fixed left-0 top-0 hidden h-screen w-64 lg:flex flex-col"
        style={sidebarStyle}
      >
        {/* Top glow */}
        <div
          className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%)',
          }}
        />

        {/* Brand strip */}
        <div className="relative px-5 py-4 flex items-center gap-2.5 border-b border-white/5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-white font-bold text-sm tracking-wide">
            Admin Panel
          </span>
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
        </div>

        <NavContent pathname={pathname} />
      </aside>

      {/* ── MOBILE top bar ───────────────────────────────────────────── */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4"
        style={{
          background: 'linear-gradient(90deg, #0f172a 0%, #0c1426 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className="flex items-center justify-center w-9 h-9 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.08] transition-all duration-200"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>

          {/* Drawer */}
          <SheetContent
            side="left"
            className="p-0 w-72 border-r-0 flex flex-col"
            style={sidebarStyle}
          >
            {/* Top glow inside drawer */}
            <div
              className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%)',
              }}
            />

            <SheetHeader className="relative px-5 py-4 border-b border-white/5">
              <SheetTitle className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-white font-bold text-sm tracking-wide">
                  Admin Panel
                </span>
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              </SheetTitle>
            </SheetHeader>

            <NavContent
              pathname={pathname}
              onNavigate={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Brand — centered */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-white font-bold text-sm tracking-wide">
              Admin Panel
            </span>
          </div>
        </div>

        {/* Right spacer keeps brand centered */}
        <div className="w-9" />
      </div>
    </>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────

function getActiveBgColor(colorClass: string): string {
  const map: Record<string, string> = {
    'text-blue-400':    'rgba(59,130,246,0.15), rgba(37,99,235,0.08)',
    'text-violet-400':  'rgba(139,92,246,0.15), rgba(109,40,217,0.08)',
    'text-cyan-400':    'rgba(34,211,238,0.12), rgba(6,182,212,0.06)',
    'text-teal-400':    'rgba(45,212,191,0.12), rgba(20,184,166,0.06)',
    'text-emerald-400': 'rgba(52,211,153,0.12), rgba(16,185,129,0.06)',
    'text-amber-400':   'rgba(251,191,36,0.12), rgba(217,119,6,0.06)',
    'text-orange-400':  'rgba(251,146,60,0.12), rgba(234,88,12,0.06)',
    'text-pink-400':    'rgba(244,114,182,0.12), rgba(219,39,119,0.06)',
    'text-indigo-400':  'rgba(99,102,241,0.15), rgba(79,70,229,0.08)',
    'text-slate-400':   'rgba(148,163,184,0.10), rgba(100,116,139,0.05)',
    'text-rose-400':    'rgba(251,113,133,0.12), rgba(225,29,72,0.06)',
    'text-gray-400':    'rgba(156,163,175,0.10), rgba(107,114,128,0.05)',
  };
  return map[colorClass] || 'rgba(99,102,241,0.15), rgba(79,70,229,0.08)';
}

function getGlowColor(colorClass: string): string {
  const map: Record<string, string> = {
    'text-blue-400':    'rgba(59,130,246,0.15)',
    'text-violet-400':  'rgba(139,92,246,0.15)',
    'text-cyan-400':    'rgba(34,211,238,0.12)',
    'text-teal-400':    'rgba(45,212,191,0.12)',
    'text-emerald-400': 'rgba(52,211,153,0.12)',
    'text-amber-400':   'rgba(251,191,36,0.12)',
    'text-orange-400':  'rgba(251,146,60,0.12)',
    'text-pink-400':    'rgba(244,114,182,0.12)',
    'text-indigo-400':  'rgba(99,102,241,0.15)',
    'text-slate-400':   'rgba(148,163,184,0.10)',
    'text-rose-400':    'rgba(251,113,133,0.12)',
    'text-gray-400':    'rgba(156,163,175,0.10)',
  };
  return map[colorClass] || 'rgba(99,102,241,0.15)';
}

function getBarColor(colorClass: string): string {
  const map: Record<string, string> = {
    'text-blue-400':    'bg-blue-400',
    'text-violet-400':  'bg-violet-400',
    'text-cyan-400':    'bg-cyan-400',
    'text-teal-400':    'bg-teal-400',
    'text-emerald-400': 'bg-emerald-400',
    'text-amber-400':   'bg-amber-400',
    'text-orange-400':  'bg-orange-400',
    'text-pink-400':    'bg-pink-400',
    'text-indigo-400':  'bg-indigo-400',
    'text-slate-400':   'bg-slate-400',
    'text-rose-400':    'bg-rose-400',
    'text-gray-400':    'bg-gray-400',
  };
  return map[colorClass] || 'bg-indigo-400';
}