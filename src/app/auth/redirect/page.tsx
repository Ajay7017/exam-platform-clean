// src/app/auth/redirect/page.tsx
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthRedirect() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    console.log('=== AUTH REDIRECT DEBUG ===')
    console.log('Status:', status)
    console.log('Session:', session)
    console.log('User role:', session?.user?.role)
    console.log('========================')

    if (status === 'loading') return

    if (!session) {
      console.log('No session, redirecting to login')
      router.push('/login')
      return
    }

    // Redirect based on role
    const targetPath = session.user.role === 'admin' ? '/admin/dashboard' : '/dashboard'
    console.log('Redirecting to:', targetPath)
    router.push(targetPath)
  }, [session, status, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
        {session && (
          <div className="mt-4 text-xs text-gray-400">
            <p>Email: {session.user?.email}</p>
            <p>Role: {session.user?.role}</p>
          </div>
        )}
      </div>
    </div>
  )
}