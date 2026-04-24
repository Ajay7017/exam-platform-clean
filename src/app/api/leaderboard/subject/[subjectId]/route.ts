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
    const session   = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const limit     = Math.min(parseInt(searchParams.get('limit') || '25'), 100)
    const subjectId = params.subjectId

    // 1. Validate subject exists
    const subject = await prisma.subject.findUnique({
      where:  { id: subjectId },
      select: { id: true, name: true }
    })

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    // 2. Get all exam IDs for this subject
    const subjectExams = await prisma.exam.findMany({
      where:  { subjectId },
      select: { id: true }
    })

    const examIds = subjectExams.map(e => e.id)

    if (examIds.length === 0) {
      return NextResponse.json({
        entries:           [],
        currentUserEntry:  null,
        totalParticipants: 0,
        subjectName:       subject.name,
        lastUpdated:       new Date().toISOString(),
      })
    }

    // 3. Aggregate per-user stats across all exams in this subject
    // Using leaderboardEntry which only contains official first attempts
    const userScores = await prisma.leaderboardEntry.groupBy({
      by:    ['userId'],
      where: { examId: { in: examIds } },
      _sum:  { score: true },
      _avg:  { percentage: true, percentile: true },
      _count:{ id: true },
      orderBy: { _sum: { score: 'desc' } }, // ← sort in DB not JS
    })

    if (userScores.length === 0) {
      return NextResponse.json({
        entries:           [],
        currentUserEntry:  null,
        totalParticipants: 0,
        subjectName:       subject.name,
        lastUpdated:       new Date().toISOString(),
      })
    }

    const totalParticipants = userScores.length

    // 4. Get user details for top N only
    const topUsers  = userScores.slice(0, limit)
    const userIds   = topUsers.map(u => u.userId)
    const users     = await prisma.user.findMany({
      where:  { id: { in: userIds } },
      select: { id: true, name: true, image: true }
    })

    const userMap = new Map(users.map(u => [u.id, u]))

    // 5. Format top entries
    // Rank is index+1 from DB-sorted results — correct
    const entries = topUsers.map((entry, index) => ({
      rank:          index + 1,
      userId:        entry.userId,
      userName:      userMap.get(entry.userId)?.name  ?? 'Anonymous',
      userImage:     userMap.get(entry.userId)?.image ?? null,
      score:         parseFloat((entry._sum.score    ?? 0).toFixed(2)),
      percentage:    parseFloat((entry._avg.percentage ?? 0).toFixed(2)),
      percentile:    parseFloat((entry._avg.percentile ?? 0).toFixed(2)),
      examsAttempted: entry._count.id,
      isCurrentUser: session?.user?.id === entry.userId,
    }))

    // 6. Current user entry — only if outside top N
    // CRITICAL FIX: rank derived from DB-sorted userScores
    // not from unsorted array index like before
    let currentUserEntry = null

    if (session?.user?.id) {
      const alreadyInTop = topUsers.some(u => u.userId === session.user.id)

      if (!alreadyInTop) {
        // Find position in the DB-sorted full list
        const userPosition = userScores.findIndex(
          u => u.userId === session.user.id
        )

        if (userPosition !== -1) {
          const userStats = userScores[userPosition]
          const userDetail = await prisma.user.findUnique({
            where:  { id: session.user.id },
            select: { id: true, name: true, image: true }
          })

          currentUserEntry = {
            rank:           userPosition + 1, // correct — from sorted array
            userId:         session.user.id,
            userName:       userDetail?.name  ?? session.user.name ?? 'Anonymous',
            userImage:      userDetail?.image ?? session.user.image ?? null,
            score:          parseFloat((userStats._sum.score      ?? 0).toFixed(2)),
            percentage:     parseFloat((userStats._avg.percentage ?? 0).toFixed(2)),
            percentile:     parseFloat((userStats._avg.percentile ?? 0).toFixed(2)),
            examsAttempted: userStats._count.id,
            isCurrentUser:  true,
          }
        }
      }
    }

    return NextResponse.json({
      entries,
      currentUserEntry,
      totalParticipants,
      subjectName: subject.name,
      lastUpdated: new Date().toISOString(),
    })

  } catch (error) {
    return handleApiError(error)
  }
}