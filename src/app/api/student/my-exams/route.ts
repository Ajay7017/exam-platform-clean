// src/app/api/student/my-exams/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Step 1: Fetch purchases
    const purchases = await prisma.purchase.findMany({
      where: {
        userId,
        status: 'active',
        examId: { not: null }
      },
      select: {
        id: true,
        examId: true,
        purchasedAt: true, // ✅ FIXED: Changed from createdAt
        validUntil: true
      },
      orderBy: { 
        purchasedAt: 'desc' // ✅ FIXED: Changed from createdAt
      }
    })

    if (purchases.length === 0) {
      return NextResponse.json({ exams: [] })
    }

    const examIds = purchases.map(p => p.examId).filter(Boolean) as string[]

    // Step 2: Fetch exam details
    const exams = await prisma.exam.findMany({
      where: {
        id: { in: examIds }
      },
      select: {
        id: true,
        title: true,
        slug: true,
        thumbnail: true,
        durationMin: true,
        totalMarks: true,
        difficulty: true,
        subject: {
          select: {
            name: true,
            slug: true
          }
        },
        questions: {
          select: {
            id: true
          }
        }
      }
    })

    // Step 3: Fetch last attempts
    const lastAttempts = await prisma.attempt.findMany({
      where: {
        userId,
        examId: { in: examIds },
        status: 'completed'
      },
      orderBy: {
        submittedAt: 'desc'
      },
      distinct: ['examId'],
      select: {
        examId: true,
        score: true,
        percentage: true,
        submittedAt: true,
        status: true
      }
    })

    // Create maps for quick lookup
    const purchaseMap = new Map(purchases.map(p => [p.examId, p]))
    const attemptMap = new Map(lastAttempts.map(a => [a.examId, a]))

    // Transform data
    const myExams = exams.map(exam => {
      const purchase = purchaseMap.get(exam.id)
      const lastAttempt = attemptMap.get(exam.id)

      // Calculate score percentage
      let scorePercentage: number | null = null;

        if (lastAttempt?.percentage != null) {
        scorePercentage = Number(Number(lastAttempt.percentage).toFixed(2));
        } 
        else if (lastAttempt?.score != null && exam.totalMarks) {
        scorePercentage = Number(
            ((lastAttempt.score / exam.totalMarks) * 100).toFixed(2)
        );
        }


      return {
        id: exam.id,
        title: exam.title,
        slug: exam.slug,
        subject: exam.subject?.name || 'Multi-Subject',
        subjectSlug: exam.subject?.slug || 'multi-subject',
        thumbnail: exam.thumbnail || null,
        duration: exam.durationMin,
        totalQuestions: exam.questions.length,
        totalMarks: exam.totalMarks,
        difficulty: exam.difficulty,
        purchasedAt: purchase?.purchasedAt.toISOString() || new Date().toISOString(),
        validUntil: purchase?.validUntil?.toISOString() || null,
        hasAttempted: !!lastAttempt,
        lastAttemptStatus: lastAttempt?.status || null,
        lastScore: lastAttempt?.score ?? null,
        lastScorePercentage: scorePercentage ?? null,
        lastAttemptDate: lastAttempt?.submittedAt?.toISOString() || null
      }
    })

    return NextResponse.json({ exams: myExams })

  } catch (error) {
    console.error('❌ Failed to fetch my exams:', error)
    
    if (error instanceof Error) {
      console.error('Message:', error.message)
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch exams',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}