// src/lib/auth-utils.ts
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { redirect } from 'next/navigation'

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
    public code?: string
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Require authentication for API routes
 * Throws AuthError if not authenticated
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    throw new AuthError('Unauthorized - Please sign in', 401, 'AUTH_REQUIRED')
  }

  if (session.user.isBlocked) {
    throw new AuthError('Account blocked - Contact support', 403, 'ACCOUNT_BLOCKED')
  }
  
  return session
}

/**
 * Require admin role for API routes
 * Throws AuthError if not admin
 */
export async function requireAdmin() {
  const session = await requireAuth()
  
  if (session.user.role !== 'admin') {
    throw new AuthError('Forbidden - Admin access required', 403, 'ADMIN_REQUIRED')
  }
  
  return session
}

/**
 * Get current session for pages (returns null if not authenticated)
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user || null
}

/**
 * Protect page routes - redirect to login if not authenticated
 */
export async function protectPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.isBlocked) {
    redirect('/blocked')
  }
  
  return session
}

/**
 * Protect admin pages - redirect if not admin
 */
export async function protectAdminPage() {
  const session = await protectPage()
  
  if (session.user.role !== 'admin') {
    redirect('/')
  }
  
  return session
}

/**
 * Check if email is admin email
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || []
  return adminEmails.includes(email)
}