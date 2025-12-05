// src/app/api/leaderboard/global/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-error'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '25')

    // 1. Aggregate best scores per user across ALL exams
    const userBestScores = await prisma.leaderboardEntry.groupBy({
      by: ['userId'],
      _sum: {
        score: true
      },
      _avg: {
        percentage: true
      },
      _count: {
        id: true
      }
    })

    // 2. Sort by total score (sum of all exams)
    const sortedUsers = userBestScores
      .sort((a, b) => (b._sum.score || 0) - (a._sum.score || 0))
      .slice(0, limit)

    // 3. Get user details
    const userIds = sortedUsers.map(u => u.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        image: true
      }
    })

    const userMap = new Map(users.map(u => [u.id, u]))

    // 4. Format entries with ranks
    const entries = sortedUsers.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      userName: userMap.get(entry.userId)?.name || 'Anonymous',
      userImage: userMap.get(entry.userId)?.image,
      score: entry._sum.score || 0,
      percentage: parseFloat((entry._avg.percentage || 0).toFixed(2)),
      timeTaken: 0, // Not applicable for global
      submittedAt: new Date().toISOString(),
      examsAttempted: entry._count.id,
      isCurrentUser: session?.user?.id === entry.userId
    }))

    // 5. Get current user's position (if not in top N)
    let currentUserEntry = null
    if (session?.user?.id) {
      const userIndex = userBestScores.findIndex(u => u.userId === session.user.id)
      if (userIndex >= limit) {
        const userStats = userBestScores[userIndex]
        currentUserEntry = {
          rank: userIndex + 1,
          userId: session.user.id,
          userName: session.user.name || 'Anonymous',
          userImage: session.user.image,
          score: userStats._sum.score || 0,
          percentage: parseFloat((userStats._avg.percentage || 0).toFixed(2)),
          timeTaken: 0,
          submittedAt: new Date().toISOString(),
          examsAttempted: userStats._count.id,
          isCurrentUser: true
        }
      }
    }

    // 6. Total participants
    const totalParticipants = userBestScores.length

    return NextResponse.json({
      entries,
      currentUserEntry,
      totalParticipants,
      examTitle: 'All Exams',
      subjectName: 'All Subjects',
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    return handleApiError(error)
  }
}