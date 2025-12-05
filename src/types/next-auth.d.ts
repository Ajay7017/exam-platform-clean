// src/types/next-auth.d.ts
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: string
      isBlocked: boolean
      phone?: string | null  // ✅ NEW: Added phone
    }
  }

  interface User {
    role: string
    isBlocked: boolean
    phone?: string | null  // ✅ NEW: Added phone
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    isBlocked: boolean
    phone?: string | null  // ✅ NEW: Added phone
  }
}