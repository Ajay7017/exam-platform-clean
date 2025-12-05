// src/app/login/page.tsx
'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FcGoogle } from 'react-icons/fc'
import { useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/auth/redirect'

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn('google', { 
        callbackUrl,
        redirect: true 
      })
    } catch (error) {
      console.error('Sign in error:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Logo/Title */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">ExamPro</h1>
            <p className="mt-2 text-gray-600">
              Sign in to access your dashboard
            </p>
          </div>

          {/* Google Sign In Button */}
          <div className="space-y-4">
            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full h-12 text-base font-medium bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 shadow-sm flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
              ) : (
                <>
                  <FcGoogle className="w-6 h-6" />
                  <span>Continue with Google</span>
                </>
              )}
            </Button>

            {/* Error Message */}
            {searchParams.get('error') && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 text-center">
                  {searchParams.get('error') === 'OAuthAccountNotLinked'
                    ? 'Email already in use with different provider'
                    : 'Something went wrong. Please try again.'}
                </p>
              </div>
            )}
          </div>

          {/* Features */}
          <div className="pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center mb-4">
              By signing in, you get access to:
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>200,000+ practice questions</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Timed mock tests</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Performance analytics</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Leaderboard rankings</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account? Sign in with Google to get started!
        </p>
      </div>
    </div>
  )
}