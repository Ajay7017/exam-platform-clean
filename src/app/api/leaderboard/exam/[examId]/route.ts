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
    const limit  = Math.min(parseInt(searchParams.get('limit') || '25'), 100)
    const examId = params.examId

    // 1. Validate exam exists
    const exam = await prisma.exam.findUnique({
      where:  { id: examId },
      select: {
        id:      true,
        title:   true,
        subject: { select: { name: true } }
      }
    })

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    // 2. Total participants (all leaderboard entries for this exam)
    const totalParticipants = await prisma.leaderboardEntry.count({
      where: { examId }
    })

    if (totalParticipants === 0) {
      return NextResponse.json({
        entries:            [],
        currentUserEntry:   null,
        totalParticipants:  0,
        examTitle:          exam.title,
        subjectName:        exam.subject?.name ?? 'Multi-Subject',
        lastUpdated:        new Date().toISOString(),
      })
    }

    // 3. Top N entries — already ranked and stored, just read them
    const topEntries = await prisma.leaderboardEntry.findMany({
      where:   { examId },
      take:    limit,
      orderBy: { rank: 'asc' },
      include: {
        user: {
          select: {
            id:    true,
            name:  true,
            image: true,
          }
        }
      }
    })

    // 4. Format top entries
    const entries = topEntries.map(entry => ({
      rank:        entry.rank,
      userId:      entry.userId,
      userName:    entry.user.name  ?? 'Anonymous',
      userImage:   entry.user.image ?? null,
      score:       entry.score,
      percentage:  parseFloat(entry.percentage.toFixed(2)),
      percentile:  parseFloat(entry.percentile.toFixed(2)),
      timeTaken:   entry.timeTaken,
      submittedAt: entry.submittedAt.toISOString(),
      isCurrentUser: session?.user?.id === entry.userId,
    }))

    // 5. Current user's entry — only needed if they're outside top N
    let currentUserEntry = null

    if (session?.user?.id) {
      const alreadyInTop = topEntries.some(e => e.userId === session.user.id)

      if (!alreadyInTop) {
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
                id:    true,
                name:  true,
                image: true,
              }
            }
          }
        })

        if (userEntry) {
          currentUserEntry = {
            rank:          userEntry.rank,
            userId:        userEntry.userId,
            userName:      userEntry.user.name  ?? 'Anonymous',
            userImage:     userEntry.user.image ?? null,
            score:         userEntry.score,
            percentage:    parseFloat(userEntry.percentage.toFixed(2)),
            percentile:    parseFloat(userEntry.percentile.toFixed(2)),
            timeTaken:     userEntry.timeTaken,
            submittedAt:   userEntry.submittedAt.toISOString(),
            isCurrentUser: true,
          }
        }
      }
    }

    return NextResponse.json({
      entries,
      currentUserEntry,
      totalParticipants,
      examTitle:   exam.title,
      subjectName: exam.subject?.name ?? 'Multi-Subject',
      lastUpdated: new Date().toISOString(),
    })

  } catch (error) {
    return handleApiError(error)
  }
}