'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import {
  Menu,
  X,
  LogIn,
  Sparkles,
  ArrowRight,
  Crown,
  BookOpen,
  FlaskConical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface NavbarProps {
  variant?: 'marketing' | 'student' | 'admin'
}

const NAV_LINKS = [
  {
    label: 'Test Series',
    href: '/exams',          // middleware will redirect unauthenticated → /login
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    label: 'Study Materials',
    href: '/study-materials',
    icon: <FlaskConical className="h-4 w-4" />,
  },
]

export function Navbar({ variant = 'marketing' }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [showNavbar, setShowNavbar] = useState(true)
  const [scrollProgress, setScrollProgress] = useState(0)
  const lastScrollY = useRef(0)
  const { data: session, status } = useSession()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleScroll = () => {
      const currentScrollY = window.scrollY

      setIsScrolled(currentScrollY > 10)

      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setShowNavbar(false)
      } else {
        setShowNavbar(true)
      }

      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setScrollProgress(docHeight > 0 ? Math.min(currentScrollY / docHeight, 1) : 0)

      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Non-marketing variants render nothing here — handled by their own sidebar components
  if (variant !== 'marketing') return null

  return (
    <>
      {/* Scroll progress bar */}
      <div
        className="fixed top-0 left-0 right-0 h-[3px] z-[100] origin-left bg-gradient-to-r from-[#1a6fd4] to-[#0ea5e9]"
        style={{ transform: `scaleX(${scrollProgress})`, transition: 'transform 0.1s linear' }}
      />

      <nav
        className={`fixed top-[3px] left-0 right-0 z-50 transition-transform duration-500 ${
          showNavbar ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div
          className={`transition-all duration-300 ${
            isScrolled
              ? 'bg-white/90 backdrop-blur-xl shadow-md border-b border-gray-200/60'
              : 'bg-white/70 backdrop-blur-sm'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-[68px] items-center justify-between gap-6">

              {/* ── Logo ── */}
              <Link href="/" className="flex-shrink-0 flex items-center group">
                <div className="relative h-12 w-[160px] transition-transform duration-300 group-hover:scale-105">
                  <Image
                    src="/logo.png"           // place your logo file in /public/logo.png
                    alt="Mockzy"
                    fill
                    className="object-contain object-left"
                    priority
                  />
                </div>
              </Link>

              {/* ── Desktop nav links ── */}
              <div className="hidden md:flex items-center gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href + link.label}
                    href={link.href}
                    className="relative flex items-center gap-1.5 px-4 py-2 text-[15px] font-medium text-gray-700 rounded-lg hover:text-[#1a6fd4] hover:bg-blue-50 transition-all duration-200 group"
                  >
                    <span className="text-gray-400 group-hover:text-[#1a6fd4] transition-colors">
                      {link.icon}
                    </span>
                    {link.label}
                    {/* underline slide */}
                    <span className="absolute bottom-1 left-4 right-4 h-[2px] rounded-full bg-[#1a6fd4] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  </Link>
                ))}
              </div>

              {/* ── Desktop auth ── */}
              <div className="hidden md:flex items-center gap-3">
                {status === 'loading' ? (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-20 rounded-lg bg-gray-100 animate-pulse" />
                    <div className="h-9 w-28 rounded-lg bg-gray-100 animate-pulse" />
                  </div>
                ) : session?.user ? (
                  /* ── Logged-in state ── */
                  <div className="flex items-center gap-3">
                    {/* Avatar + name */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200">
                      {session.user.image ? (
                        <img
                          src={session.user.image}
                          alt={session.user.name || 'User'}
                          className="w-7 h-7 rounded-full ring-2 ring-[#1a6fd4]/40"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#1a6fd4] flex items-center justify-center text-white text-sm font-bold">
                          {session.user.name?.charAt(0) ?? 'U'}
                        </div>
                      )}
                      <div className="text-sm leading-tight">
                        <p className="font-semibold text-gray-900 leading-none">
                          {session.user.name?.split(' ')[0]}
                        </p>
                        {session.user.role && (
                          <p className="text-[11px] text-gray-400 flex items-center gap-0.5 mt-0.5">
                            {session.user.role === 'admin' && <Crown className="h-2.5 w-2.5" />}
                            {session.user.role}
                          </p>
                        )}
                      </div>
                    </div>

                    <Link href={session.user.role === 'admin' ? '/admin/dashboard' : '/dashboard'}>
                      <Button
                        size="sm"
                        className="bg-[#1a6fd4] hover:bg-[#1558b0] text-white shadow-sm"
                      >
                        Dashboard
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </Link>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="text-gray-500 hover:text-gray-800"
                    >
                      Sign out
                    </Button>
                  </div>
                ) : (
                  /* ── Logged-out state ── */
                  <>
                    <Link href="/login">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-700 hover:text-[#1a6fd4] font-medium"
                      >
                        <LogIn className="mr-1.5 h-4 w-4" />
                        Login
                      </Button>
                    </Link>

                    <Link href="/login">
                      <Button
                        size="sm"
                        className="relative overflow-hidden bg-[#1a6fd4] hover:bg-[#1558b0] text-white font-semibold px-5 shadow-md shadow-blue-200 hover:shadow-blue-300 transition-all duration-300 group"
                      >
                        {/* shine sweep */}
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        <span className="relative">Get Started</span>
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* ── Mobile hamburger ── */}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" aria-label="Toggle menu">
                    <div className="relative w-5 h-5">
                      <Menu
                        className={`h-5 w-5 absolute inset-0 transition-all duration-300 ${
                          isOpen ? 'opacity-0 rotate-90' : 'opacity-100 rotate-0'
                        }`}
                      />
                      <X
                        className={`h-5 w-5 absolute inset-0 transition-all duration-300 ${
                          isOpen ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90'
                        }`}
                      />
                    </div>
                  </Button>
                </SheetTrigger>

                <SheetContent side="right" className="w-full sm:w-[360px] p-0 flex flex-col">
                  {/* Sheet header */}
                  <SheetHeader className="px-6 py-5 border-b border-gray-100">
                    <SheetTitle className="flex items-center gap-3">
                      <div className="relative h-10 w-[130px]">
                        <Image
                          src="/logo.png"
                          alt="Mockzy"
                          fill
                          className="object-contain object-left"
                        />
                      </div>
                    </SheetTitle>
                  </SheetHeader>

                  {/* Mobile links */}
                  <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
                    {NAV_LINKS.map((link) => (
                      <Link
                        key={link.label}
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-[#1a6fd4] transition-all"
                      >
                        <span className="text-gray-400">{link.icon}</span>
                        {link.label}
                      </Link>
                    ))}
                  </div>

                  {/* Mobile auth */}
                  <div className="border-t border-gray-100 px-4 py-5 space-y-3">
                    {status === 'loading' ? (
                      <>
                        <div className="h-11 rounded-xl bg-gray-100 animate-pulse" />
                        <div className="h-11 rounded-xl bg-gray-100 animate-pulse" />
                      </>
                    ) : session?.user ? (
                      <>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                          {session.user.image ? (
                            <img
                              src={session.user.image}
                              alt={session.user.name || 'User'}
                              className="w-10 h-10 rounded-full ring-2 ring-[#1a6fd4]/40"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#1a6fd4] flex items-center justify-center text-white font-bold text-lg">
                              {session.user.name?.charAt(0) ?? 'U'}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{session.user.name}</p>
                            {session.user.role && (
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                {session.user.role === 'admin' && <Crown className="h-3 w-3" />}
                                {session.user.role}
                              </p>
                            )}
                          </div>
                        </div>

                        <Link
                          href={session.user.role === 'admin' ? '/admin/dashboard' : '/dashboard'}
                          onClick={() => setIsOpen(false)}
                        >
                          <Button className="w-full bg-[#1a6fd4] hover:bg-[#1558b0] text-white">
                            Go to Dashboard
                          </Button>
                        </Link>

                        <Button
                          variant="ghost"
                          className="w-full text-gray-500"
                          onClick={() => {
                            setIsOpen(false)
                            signOut({ callbackUrl: '/' })
                          }}
                        >
                          Sign Out
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link href="/login" onClick={() => setIsOpen(false)}>
                          <Button variant="outline" className="w-full border-gray-300">
                            <LogIn className="mr-2 h-4 w-4" />
                            Login
                          </Button>
                        </Link>
                        <Link href="/login" onClick={() => setIsOpen(false)}>
                          <Button className="w-full bg-[#1a6fd4] hover:bg-[#1558b0] text-white font-semibold">
                            <Sparkles className="mr-2 h-4 w-4" />
                            Get Started Free
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>

            </div>
          </div>
        </div>
      </nav>

      {/* Spacer so page content doesn't hide under fixed nav */}
      <div className="h-[71px]" />
    </>
  )
}