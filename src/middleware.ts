// src/middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith('/login')
    const isAdminPage = req.nextUrl.pathname.startsWith('/admin')
    const isDashboard = req.nextUrl.pathname.startsWith('/dashboard')
    const isExamPage = req.nextUrl.pathname.startsWith('/exam/')
    const isProfilePage = req.nextUrl.pathname.startsWith('/profile')
    const isResultsPage = req.nextUrl.pathname.startsWith('/results')
    const isLeaderboardPage = req.nextUrl.pathname.startsWith('/leaderboard')
    const isHistoryPage = req.nextUrl.pathname.startsWith('/history')
    const isExamsPage = req.nextUrl.pathname.startsWith('/exams')

    // Redirect authenticated users away from login page
    if (isAuthPage && isAuth) {
      const callbackUrl = req.nextUrl.searchParams.get('callbackUrl')
      if (callbackUrl && callbackUrl !== '/login') {
        return NextResponse.redirect(new URL(callbackUrl, req.url))
      }
      // Redirect to admin dashboard or student dashboard based on role
      const redirectUrl = token.role === 'admin' ? '/admin/dashboard' : '/dashboard'
      return NextResponse.redirect(new URL(redirectUrl, req.url))
    }

    // Check for blocked users
    if (isAuth && token.isBlocked) {
      return NextResponse.redirect(new URL('/blocked', req.url))
    }

    // Protect admin routes
    if (isAdminPage) {
      if (!isAuth) {
        return NextResponse.redirect(new URL('/login?callbackUrl=/admin', req.url))
      }
      if (token.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Protect student routes
    if ((isDashboard || isExamPage || isResultsPage || isLeaderboardPage || isHistoryPage || isExamsPage) && !isAuth) {
      const callbackUrl = encodeURIComponent(req.nextUrl.pathname)
      return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, req.url))
    }

    // ✅ NEW: Check if student needs to complete phone number
    // Allow profile page access even without phone
    if (isAuth && token.role === 'student' && !isProfilePage) {
      // Note: We can't directly check database here in middleware
      // So we'll handle this client-side with a banner/modal
      // The token doesn't include phone info by default
      
      // If you want to enforce it here, you need to add phone to JWT token
      // See the comment below for implementation
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Return true to allow the middleware function to run
        // We handle all auth logic in the middleware function above
        return true
      },
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/exam/:path*',
    '/exams/:path*',
    '/profile/:path*',
    '/results/:path*',
    '/leaderboard/:path*',
    '/history/:path*',
    '/login',
  ],
}