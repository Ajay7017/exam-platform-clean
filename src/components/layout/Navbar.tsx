'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { 
  Menu, 
  X, 
  GraduationCap, 
  LogIn, 
  UserPlus, 
  ChevronDown,
  Sparkles,
  Trophy,
  BookOpen,
  FileText,
  Brain,
  Target,
  Zap,
  Crown,
  ArrowRight
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

// Exam Categories for Mega Menu
const examCategories = [
  {
    icon: <GraduationCap className="h-5 w-5" />,
    title: 'Engineering',
    exams: ['GATE', 'JEE Main', 'JEE Advanced', 'BITSAT'],
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: 'Government Jobs',
    exams: ['SSC CGL', 'SSC CHSL', 'RRB NTPC', 'UPSC'],
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: <Brain className="h-5 w-5" />,
    title: 'Medical',
    exams: ['NEET UG', 'NEET PG', 'AIIMS', 'JIPMER'],
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: <Trophy className="h-5 w-5" />,
    title: 'Banking',
    exams: ['IBPS PO', 'SBI Clerk', 'RBI Grade B', 'NABARD'],
    color: 'from-orange-500 to-red-500'
  }
]

export function Navbar({ variant = 'marketing' }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [showNavbar, setShowNavbar] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [showMegaMenu, setShowMegaMenu] = useState(false)
  const { data: session, status } = useSession()

  // Handle scroll behavior
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Update scrolled state for styling
      setIsScrolled(currentScrollY > 10)
      
      // Show/hide navbar based on scroll direction
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowNavbar(false) // Scrolling down
      } else {
        setShowNavbar(true) // Scrolling up
      }
      
      // Calculate scroll progress
      const windowHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = windowHeight > 0 ? (currentScrollY / windowHeight) : 0
      setScrollProgress(Math.min(progress, 1))
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Navigation links for marketing pages
  const navLinks =
    variant === 'marketing'
      ? [
          { label: 'Home', href: '/' },
          { label: 'Features', href: '/#features' },
          { label: 'Pricing', href: '/#pricing' },
          { label: 'About', href: '/#about' },
        ]
      : []

  return (
    <>
      {/* Scroll Progress Indicator */}
      {variant === 'marketing' && (
        <div 
          className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 z-[100] transform origin-left transition-transform duration-300"
          style={{ transform: `scaleX(${scrollProgress})` }}
        />
      )}

      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          showNavbar ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div 
          className={`transition-all duration-300 ${
            isScrolled 
              ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-lg border-b border-gray-200/50 dark:border-gray-700/50' 
              : 'bg-transparent'
          }`}
        >
          <div className="container mx-auto px-4">
            <div className="flex h-20 items-center justify-between">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative">
                  {/* Animated background glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Logo container */}
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                    <GraduationCap className="h-7 w-7 text-white" />
                  </div>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    ExamPro
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium -mt-1">
                    Ace Your Exams
                  </span>
                </div>
              </Link>

              {/* Desktop Navigation */}
              {variant === 'marketing' && (
                <div className="hidden lg:flex lg:items-center lg:gap-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="relative px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:text-gray-900 dark:hover:text-white group"
                    >
                      {link.label}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-300" />
                    </Link>
                  ))}
                  
                  {/* Exams Mega Menu Trigger */}
                  <div 
                    className="relative"
                    onMouseEnter={() => setShowMegaMenu(true)}
                    onMouseLeave={() => setShowMegaMenu(false)}
                  >
                    <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:text-gray-900 dark:hover:text-white group">
                      Exams
                      <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showMegaMenu ? 'rotate-180' : ''}`} />
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-300" />
                    </button>
                  </div>
                </div>
              )}

              {/* Desktop Auth Buttons */}
              {variant === 'marketing' && (
                <div className="hidden lg:flex lg:items-center lg:gap-3">
                  {status === 'loading' ? (
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                  ) : session?.user ? (
                    <div className="flex items-center gap-3">
                      {/* User Info */}
                      <div className="hidden xl:flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        {session.user.image ? (
                          <img
                            src={session.user.image}
                            alt={session.user.name || 'User'}
                            className="w-8 h-8 rounded-full ring-2 ring-blue-500"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {session.user.name?.charAt(0) || 'U'}
                          </div>
                        )}
                        <div className="text-sm">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {session.user.name}
                          </p>
                          {session.user.role && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              {session.user.role === 'admin' && <Crown className="h-3 w-3" />}
                              {session.user.role}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Dashboard Button */}
                      <Link href={session.user.role === 'admin' ? '/admin/dashboard' : '/dashboard'}>
                        <Button variant="outline" className="group relative overflow-hidden">
                          <span className="relative z-10">Dashboard</span>
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity" />
                        </Button>
                      </Link>

                      {/* Sign Out */}
                      <Button
                        variant="ghost"
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button 
                        variant="ghost" 
                        asChild
                        className="group relative overflow-hidden"
                      >
                        <Link href="/login" className="flex items-center gap-2">
                          <LogIn className="h-4 w-4" />
                          Login
                        </Link>
                      </Button>
                      
                      <Button 
                        asChild
                        className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Link href="/login" className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Get Started
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Mobile Menu Button */}
              {variant === 'marketing' && (
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                  <SheetTrigger asChild className="lg:hidden">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="relative"
                      aria-label="Toggle menu"
                    >
                      <div className="relative w-6 h-6">
                        <Menu className={`h-6 w-6 absolute inset-0 transition-all duration-300 ${isOpen ? 'opacity-0 rotate-90' : 'opacity-100 rotate-0'}`} />
                        <X className={`h-6 w-6 absolute inset-0 transition-all duration-300 ${isOpen ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90'}`} />
                      </div>
                    </Button>
                  </SheetTrigger>

                  <SheetContent side="right" className="w-full sm:w-[400px] p-0">
                    <div className="flex flex-col h-full">
                      {/* Header */}
                      <SheetHeader className="px-6 py-6 border-b border-gray-200 dark:border-gray-800">
                        <SheetTitle className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
                            <GraduationCap className="h-6 w-6 text-white" />
                          </div>
                          <span className="text-xl font-bold">Menu</span>
                        </SheetTitle>
                      </SheetHeader>

                      {/* Mobile Navigation */}
                      <div className="flex-1 overflow-y-auto px-6 py-6">
                        <div className="space-y-2">
                          {/* Main Links */}
                          {navLinks.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setIsOpen(false)}
                              className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                            >
                              {link.label}
                            </Link>
                          ))}

                          {/* Exams Link */}
                          <Link
                            href="/exams"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                          >
                            <BookOpen className="h-5 w-5" />
                            All Exams
                          </Link>

                          {/* Exam Categories */}
                          <div className="pt-4 pb-2">
                            <p className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Popular Categories
                            </p>
                          </div>
                          {examCategories.map((category, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-lg bg-gradient-to-br ${category.color} text-white`}>
                                  {category.icon}
                                </div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                  {category.title}
                                </h4>
                              </div>
                              <div className="flex flex-wrap gap-2 ml-11">
                                {category.exams.map((exam) => (
                                  <span
                                    key={exam}
                                    className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                  >
                                    {exam}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Mobile Auth Section */}
                      <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-6 space-y-3">
                        {status === 'loading' ? (
                          <div className="space-y-3">
                            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                          </div>
                        ) : session?.user ? (
                          <>
                            {/* User Info */}
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                              {session.user.image ? (
                                <img
                                  src={session.user.image}
                                  alt={session.user.name || 'User'}
                                  className="w-10 h-10 rounded-full ring-2 ring-blue-500"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                                  {session.user.name?.charAt(0) || 'U'}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {session.user.name}
                                </p>
                                {session.user.role && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
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
                              <Button variant="outline" className="w-full">
                                Go to Dashboard
                              </Button>
                            </Link>
                            
                            <Button
                              variant="ghost"
                              className="w-full"
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
                            <Button variant="outline" asChild className="w-full">
                              <Link href="/login" onClick={() => setIsOpen(false)}>
                                <LogIn className="mr-2 h-4 w-4" />
                                Login
                              </Link>
                            </Button>
                            <Button asChild className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                              <Link href="/login" onClick={() => setIsOpen(false)}>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Get Started Free
                              </Link>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </div>
        </div>

        {/* Mega Menu Dropdown */}
        {variant === 'marketing' && (
          <div
            className={`absolute top-full left-0 right-0 transition-all duration-300 ${
              showMegaMenu 
                ? 'opacity-100 translate-y-0 pointer-events-auto' 
                : 'opacity-0 -translate-y-4 pointer-events-none'
            }`}
            onMouseEnter={() => setShowMegaMenu(true)}
            onMouseLeave={() => setShowMegaMenu(false)}
          >
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 shadow-2xl">
              <div className="container mx-auto px-4 py-8">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {examCategories.map((category, idx) => (
                    <Link
                      key={idx}
                      href="/exams"
                      className="group p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-transparent hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-800 hover:scale-105"
                      style={{
                        transitionDelay: `${idx * 50}ms`
                      }}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                        {category.icon}
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3">
                        {category.title}
                      </h3>
                      <div className="space-y-2">
                        {category.exams.map((exam) => (
                          <div
                            key={exam}
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2"
                          >
                            <Zap className="h-3 w-3" />
                            {exam}
                          </div>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>

                {/* View All Link */}
                <div className="mt-6 text-center">
                  <Link
                    href="/exams"
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 group"
                  >
                    View All 450+ Exams
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Spacer to prevent content from hiding under fixed navbar */}
      <div className="h-20" />
    </>
  )
}