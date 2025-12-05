// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false

      // Check if user is blocked
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      })

      if (existingUser?.isBlocked) {
        return false
      }

      // Get admin emails from environment
      const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || []
      const isAdmin = adminEmails.includes(user.email)
      const targetRole = isAdmin ? 'admin' : 'student'

      // Update or create user with correct role
      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { 
            lastLoginAt: new Date(),
            role: targetRole, // Ensure role is correct
          },
        })
      }
      // Note: New users are created by PrismaAdapter, we'll fix role in jwt callback

      return true
    },
    async jwt({ token, user, account, profile, trigger, session }) {
      // Get admin emails from environment
      const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || []
      
      // Initial sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        
        // Check if email is in admin list
        const isAdmin = user.email ? adminEmails.includes(user.email) : false
        const correctRole = isAdmin ? 'admin' : 'student'
        
        // Fetch user data including phone
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, isBlocked: true, phone: true }
        })
        
        // Update role in database if it doesn't match
        if (dbUser && dbUser.role !== correctRole) {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: correctRole },
          })
          token.role = correctRole
        } else {
          token.role = dbUser?.role || user.role || 'student'
        }
        
        token.isBlocked = dbUser?.isBlocked || user.isBlocked || false
        token.phone = dbUser?.phone || null // ✅ NEW: Add phone to token
      }
      
      // Fetch latest user data on subsequent requests
      if (token.id && !user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, isBlocked: true, email: true, phone: true }, // ✅ Added phone
        })
        
        if (dbUser) {
          // Re-check admin status in case env changed
          const isAdmin = dbUser.email ? adminEmails.includes(dbUser.email) : false
          const correctRole = isAdmin ? 'admin' : 'student'
          
          if (dbUser.role !== correctRole) {
            await prisma.user.update({
              where: { id: token.id as string },
              data: { role: correctRole },
            })
            token.role = correctRole
          } else {
            token.role = dbUser.role
          }
          
          token.isBlocked = dbUser.isBlocked
          token.phone = dbUser.phone || null // ✅ NEW: Update phone in token
        }
      }
      
      return token
    },
    async session({ session, user, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.isBlocked = token.isBlocked as boolean
        session.user.phone = token.phone as string | null // ✅ NEW: Add phone to session
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // If the URL is a relative path, use it
      if (url.startsWith('/')) return `${baseUrl}${url}`
      
      // If the URL's origin matches the base URL, use it
      else if (new URL(url).origin === baseUrl) return url
      
      // Redirect to a handler page that will check role
      return `${baseUrl}/auth/redirect`
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}