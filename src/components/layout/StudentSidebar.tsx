// src/components/layout/StudentSidebar.tsx
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
  Trophy,
  Award,
  User,
  Clock,
  ChevronRight,
  LogOut,
  ShoppingBag,
  GraduationCap,
  MessageSquare,
  Zap,
  Menu,
} from 'lucide-react';

const navGroups = [
  {
    title: 'Main',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        color: 'text-blue-400',
        activeGlow: 'shadow-blue-500/20',
        activeBg: 'from-blue-500/20 to-blue-600/10',
      },
      {
        label: 'My Exams',
        href: '/my-exams',
        icon: GraduationCap,
        color: 'text-violet-400',
        activeGlow: 'shadow-violet-500/20',
        activeBg: 'from-violet-500/20 to-violet-600/10',
      },
      {
        label: 'Browse Exams',
        href: '/exams',
        icon: BookOpen,
        color: 'text-cyan-400',
        activeGlow: 'shadow-cyan-500/20',
        activeBg: 'from-cyan-500/20 to-cyan-600/10',
      },
      {
        label: 'My Results',
        href: '/results',
        icon: Trophy,
        color: 'text-amber-400',
        activeGlow: 'shadow-amber-500/20',
        activeBg: 'from-amber-500/20 to-amber-600/10',
      },
      {
        label: 'My Purchases',
        href: '/purchases',
        icon: ShoppingBag,
        color: 'text-emerald-400',
        activeGlow: 'shadow-emerald-500/20',
        activeBg: 'from-emerald-500/20 to-emerald-600/10',
      },
      {
        label: 'Feedback',
        href: '/feedback',
        icon: MessageSquare,
        color: 'text-pink-400',
        activeGlow: 'shadow-pink-500/20',
        activeBg: 'from-pink-500/20 to-pink-600/10',
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
        color: 'text-orange-400',
        activeGlow: 'shadow-orange-500/20',
        activeBg: 'from-orange-500/20 to-orange-600/10',
      },
      {
        label: 'Practice History',
        href: '/history',
        icon: Clock,
        color: 'text-slate-400',
        activeGlow: 'shadow-slate-500/20',
        activeBg: 'from-slate-500/20 to-slate-600/10',
      },
      {
        label: 'Profile',
        href: '/profile',
        icon: User,
        color: 'text-teal-400',
        activeGlow: 'shadow-teal-500/20',
        activeBg: 'from-teal-500/20 to-teal-600/10',
      },
    ],
  },
];

// ── Shared nav content (used in both desktop sidebar & mobile drawer) ─────

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
                const isActive = pathname === item.href;
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

export function StudentSidebar() {
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
            Mockzy
          </span>
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
        </div>

        <NavContent pathname={pathname} />
      </aside>

      {/* ── MOBILE top bar ───────────────────────────────────────────── */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4"
        style={{
          background:
            'linear-gradient(90deg, #0f172a 0%, #0c1426 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Hamburger — opens drawer */}
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
                  Mockzy
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

        {/* Brand name — center */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-white font-bold text-sm tracking-wide">
              Mockzy
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
    'text-blue-400': 'rgba(59,130,246,0.15), rgba(37,99,235,0.08)',
    'text-violet-400': 'rgba(139,92,246,0.15), rgba(109,40,217,0.08)',
    'text-cyan-400': 'rgba(34,211,238,0.12), rgba(6,182,212,0.06)',
    'text-amber-400': 'rgba(251,191,36,0.12), rgba(217,119,6,0.06)',
    'text-emerald-400': 'rgba(52,211,153,0.12), rgba(16,185,129,0.06)',
    'text-pink-400': 'rgba(244,114,182,0.12), rgba(219,39,119,0.06)',
    'text-orange-400': 'rgba(251,146,60,0.12), rgba(234,88,12,0.06)',
    'text-slate-400': 'rgba(148,163,184,0.10), rgba(100,116,139,0.05)',
    'text-teal-400': 'rgba(45,212,191,0.12), rgba(20,184,166,0.06)',
  };
  return map[colorClass] || 'rgba(99,102,241,0.15), rgba(79,70,229,0.08)';
}

function getGlowColor(colorClass: string): string {
  const map: Record<string, string> = {
    'text-blue-400': 'rgba(59,130,246,0.15)',
    'text-violet-400': 'rgba(139,92,246,0.15)',
    'text-cyan-400': 'rgba(34,211,238,0.12)',
    'text-amber-400': 'rgba(251,191,36,0.12)',
    'text-emerald-400': 'rgba(52,211,153,0.12)',
    'text-pink-400': 'rgba(244,114,182,0.12)',
    'text-orange-400': 'rgba(251,146,60,0.12)',
    'text-slate-400': 'rgba(148,163,184,0.10)',
    'text-teal-400': 'rgba(45,212,191,0.12)',
  };
  return map[colorClass] || 'rgba(99,102,241,0.15)';
}

function getBarColor(colorClass: string): string {
  const map: Record<string, string> = {
    'text-blue-400': 'bg-blue-400',
    'text-violet-400': 'bg-violet-400',
    'text-cyan-400': 'bg-cyan-400',
    'text-amber-400': 'bg-amber-400',
    'text-emerald-400': 'bg-emerald-400',
    'text-pink-400': 'bg-pink-400',
    'text-orange-400': 'bg-orange-400',
    'text-slate-400': 'bg-slate-400',
    'text-teal-400': 'bg-teal-400',
  };
  return map[colorClass] || 'bg-indigo-400';
}