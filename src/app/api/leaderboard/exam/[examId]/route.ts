// src/app/api/leaderboard/exam/[examId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-error'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '25')
    const examId = params.examId

    // 1. Get exam details
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        title: true,
        subject: {
          select: { name: true }
        }
      }
    })

    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      )
    }

    // 2. Get top N leaderboard entries
    const topEntries = await prisma.leaderboardEntry.findMany({
      where: { examId },
      take: limit,
      orderBy: [
        { rank: 'asc' }
      ],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })

    // 3. Get current user's entry (if logged in and not in top N)
    let currentUserEntry = null
    if (session?.user?.id) {
      const userEntry = await prisma.leaderboardEntry.findUnique({
        where: {
          examId_userId: {
            examId,
            userId: session.user.id
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      })

      if (userEntry && !topEntries.find(e => e.userId === session.user.id)) {
        currentUserEntry = {
          rank: userEntry.rank,
          userId: userEntry.userId,
          userName: userEntry.user.name || 'Anonymous',
          userImage: userEntry.user.image,
          score: userEntry.score,
          percentage: parseFloat(userEntry.percentage.toFixed(2)),
          timeTaken: userEntry.timeTaken,
          submittedAt: userEntry.submittedAt.toISOString(),
          isCurrentUser: true
        }
      }
    }

    // 4. Get total participants
    const totalParticipants = await prisma.leaderboardEntry.count({
      where: { examId }
    })

    // 5. Format response
    const entries = topEntries.map(entry => ({
      rank: entry.rank,
      userId: entry.userId,
      userName: entry.user.name || 'Anonymous',
      userImage: entry.user.image,
      score: entry.score,
      percentage: parseFloat(entry.percentage.toFixed(2)),
      timeTaken: entry.timeTaken,
      submittedAt: entry.submittedAt.toISOString(),
      isCurrentUser: session?.user?.id === entry.userId
    }))

    return NextResponse.json({
      entries,
      currentUserEntry,
      totalParticipants,
      examTitle: exam.title,
      subjectName: exam.subject?.name || 'Multi-Subject',
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    return handleApiError(error)
  }
}