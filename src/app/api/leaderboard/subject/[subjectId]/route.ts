// src/app/api/leaderboard/subject/[subjectId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-error'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { subjectId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '25')
    const subjectId = params.subjectId

    // 1. Get subject details
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, name: true }
    })

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      )
    }

    // 2. Get all exams for this subject
    const subjectExams = await prisma.exam.findMany({
      where: { subjectId },
      select: { id: true }
    })

    const examIds = subjectExams.map(e => e.id)

    if (examIds.length === 0) {
      return NextResponse.json({
        entries: [],
        currentUserEntry: null,
        totalParticipants: 0,
        examTitle: `${subject.name} Exams`,
        subjectName: subject.name,
        lastUpdated: new Date().toISOString()
      })
    }

    // 3. Aggregate scores per user for this subject
    const userScores = await prisma.leaderboardEntry.groupBy({
      by: ['userId'],
      where: {
        examId: { in: examIds }
      },
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

    // 4. Sort and limit
    const sortedUsers = userScores
      .sort((a, b) => (b._sum.score || 0) - (a._sum.score || 0))
      .slice(0, limit)

    // 5. Get user details
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

    // 6. Format entries
    const entries = sortedUsers.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      userName: userMap.get(entry.userId)?.name || 'Anonymous',
      userImage: userMap.get(entry.userId)?.image,
      score: entry._sum.score || 0,
      percentage: parseFloat((entry._avg.percentage || 0).toFixed(2)),
      timeTaken: 0,
      submittedAt: new Date().toISOString(),
      examsAttempted: entry._count.id,
      isCurrentUser: session?.user?.id === entry.userId
    }))

    // 7. Current user entry
    let currentUserEntry = null
    if (session?.user?.id) {
      const userIndex = userScores.findIndex(u => u.userId === session.user.id)
      if (userIndex >= limit) {
        const userStats = userScores[userIndex]
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

    const totalParticipants = userScores.length

    return NextResponse.json({
      entries,
      currentUserEntry,
      totalParticipants,
      examTitle: `${subject.name} Exams`,
      subjectName: subject.name,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    return handleApiError(error)
  }
}