// src/components/layout/PhoneRequiredBanner.tsx
'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Phone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PhoneRequiredBanner() {
  const [show, setShow] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Don't show on profile page
    if (pathname === '/profile') {
      setShow(false)
      return
    }

    // Check if user has phone number
    const checkPhone = async () => {
      try {
        const response = await fetch('/api/student/profile')
        if (response.ok) {
          const data = await response.json()
          setPhoneNumber(data.user.phone)
          
          // Show banner if no phone
          if (!data.user.phone) {
            setShow(true)
          }
        }
      } catch (error) {
        console.error('Error checking phone:', error)
      }
    }

    checkPhone()
  }, [pathname])

  if (!show || phoneNumber) return null

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-amber-50 border-b-2 border-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Phone className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">
                Complete Your Profile
              </p>
              <p className="text-sm text-amber-700">
                Please add your phone number to continue using the platform
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => router.push('/profile')}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Add Phone Number
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShow(false)}
              className="text-amber-700 hover:text-amber-900"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}