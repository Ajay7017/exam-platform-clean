// src/app/api/admin/users/cleanup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    // 1. Identify test users
    const testUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { endsWith: '@mockzy.co.in' } },
          { name: { contains: 'Stress Bot' } },
          { name: { contains: 'test-user' } }
        ],
        role: { not: 'admin' } // Safety guard
      },
      select: { id: true }
    })

    const userIds = testUsers.map(u => u.id)

    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No test users found to clean up.',
      })
    }

    // 2. Ordered Deletion (Deepest children first)
    await prisma.$transaction([
      // First: Delete leaderboard entries (They depend on Attempts)
      prisma.leaderboardEntry.deleteMany({
        where: { userId: { in: userIds } }
      }),
      
      // Second: Delete attempts (They depend on Users)
      prisma.attempt.deleteMany({
        where: { userId: { in: userIds } }
      }),

      // Third: Delete other direct dependencies
      prisma.purchase.deleteMany({
        where: { userId: { in: userIds } }
      }),
      prisma.account.deleteMany({
        where: { userId: { in: userIds } }
      }),
      prisma.session.deleteMany({
        where: { userId: { in: userIds } }
      }),

      // Finally: Delete the users
      prisma.user.deleteMany({
        where: { id: { in: userIds } }
      })
    ])

    return NextResponse.json({
      success: true,
      message: `System cleanup complete. Removed ${userIds.length} test users and all associated exam history.`,
    })

  } catch (error) {
    console.error('Cleanup Error:', error)
    return handleApiError(error)
  }
}