// src/app/api/student/my-exams/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // ── 1. Purchased exams (paid or free via purchase record) ─────────────
    const purchases = await prisma.purchase.findMany({
      where: { userId, status: 'active', examId: { not: null } },
      select: {
        id: true,
        examId: true,
        purchasedAt: true,
        validUntil: true,
      },
      orderBy: { purchasedAt: 'desc' },
    })

    const purchasedExamIds = purchases
      .map(p => p.examId)
      .filter(Boolean) as string[]

    // ── 2. Free exams attempted by this student (no purchase record) ──────
    const freeAttempts = await prisma.attempt.findMany({
      where: {
        userId,
        status: 'completed',
        exam: { isFree: true },
        // exclude exams already covered by purchases
        examId: purchasedExamIds.length > 0
          ? { notIn: purchasedExamIds }
          : undefined,
      },
      distinct: ['examId'],
      select: { examId: true, submittedAt: true },
      orderBy: { submittedAt: 'desc' },
    })

    const freeAttemptedExamIds = freeAttempts
      .map(a => a.examId)
      .filter(Boolean) as string[]

    // ── 3. All relevant exam IDs ───────────────────────────────────────────
    const allExamIds = [...new Set([...purchasedExamIds, ...freeAttemptedExamIds])]

    if (allExamIds.length === 0) {
      return NextResponse.json({ exams: [] })
    }

    // ── 4. Fetch exam details ─────────────────────────────────────────────
    const exams = await prisma.exam.findMany({
      where: { id: { in: allExamIds } },
      select: {
        id: true,
        title: true,
        slug: true,
        thumbnail: true,
        durationMin: true,
        totalMarks: true,
        difficulty: true,
        isFree: true,
        subject: { select: { name: true, slug: true } },
        questions: { select: { id: true } },
      },
    })

    // ── 5. Fetch last completed attempt per exam ───────────────────────────
    const lastAttempts = await prisma.attempt.findMany({
      where: {
        userId,
        examId: { in: allExamIds },
        status: 'completed',
      },
      orderBy: { submittedAt: 'desc' },
      distinct: ['examId'],
      select: {
        examId: true,
        score: true,
        percentage: true,
        submittedAt: true,
        status: true,
      },
    })

    // ── 6. Build lookup maps ──────────────────────────────────────────────
    const purchaseMap   = new Map(purchases.map(p => [p.examId, p]))
    const attemptMap    = new Map(lastAttempts.map(a => [a.examId, a]))
    const freeAttemptMap = new Map(freeAttempts.map(a => [a.examId, a]))

    // ── 7. Transform ──────────────────────────────────────────────────────
    const myExams = exams.map(exam => {
      const purchase    = purchaseMap.get(exam.id)
      const lastAttempt = attemptMap.get(exam.id)
      const firstFreeAt = freeAttemptMap.get(exam.id)

      let scorePercentage: number | null = null
      if (lastAttempt?.percentage != null) {
        scorePercentage = Number(Number(lastAttempt.percentage).toFixed(2))
      } else if (lastAttempt?.score != null && exam.totalMarks) {
        scorePercentage = Number(
          ((lastAttempt.score / exam.totalMarks) * 100).toFixed(2)
        )
      }

      // enrolledAt: use purchase date if available, otherwise first free attempt date
      const enrolledAt =
        purchase?.purchasedAt.toISOString() ||
        firstFreeAt?.submittedAt?.toISOString() ||
        new Date().toISOString()

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
        isFree: exam.isFree,
        purchasedAt: enrolledAt,
        validUntil: purchase?.validUntil?.toISOString() || null,
        hasAttempted: !!lastAttempt,
        lastAttemptStatus: lastAttempt?.status || null,
        lastScore: lastAttempt?.score ?? null,
        lastScorePercentage: scorePercentage ?? null,
        lastAttemptDate: lastAttempt?.submittedAt?.toISOString() || null,
      }
    })

    // Sort: most recently enrolled/attempted first
    myExams.sort(
      (a, b) =>
        new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
    )

    return NextResponse.json({ exams: myExams })
  } catch (error) {
    console.error('❌ Failed to fetch my exams:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch exams',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}