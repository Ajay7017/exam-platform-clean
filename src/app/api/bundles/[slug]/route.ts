// src/app/api/bundles/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const userId  = session?.user?.id
    const { slug } = params

    const bundle = await prisma.bundle.findUnique({
      where: { slug },
      include: {
        exams: {
          include: {
            exam: {
              select: {
                id:         true,
                title:      true,
                slug:       true,
                durationMin:true,
                totalMarks: true,
                difficulty: true,
                isFree:     true,
                price:      true,
                subject:    { select: { name: true, slug: true } },
                _count:     { select: { attempts: true } },
                questions:  { select: { id: true } },
              },
            },
          },
        },
      },
    })

    if (!bundle || !bundle.isActive) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    // ── Purchase status ────────────────────────────────────────────────────
    let isPurchased = false
    if (userId) {
      const purchase = await prisma.purchase.findFirst({
        where: {
          userId,
          bundleId: bundle.id,
          status: 'active',
          OR: [
            { validUntil: null },
            { validUntil: { gte: new Date() } },
          ],
        },
      })
      isPurchased = !!purchase
    }

    // ── Sequential unlock logic ────────────────────────────────────────────
    // Only relevant for purchased bundles with a logged-in user.
    // For non-purchased bundles every exam shows as locked anyway (no Start button).
    //
    // Strategy:
    //   - Fetch all graded attempt examIds for this user in one query
    //   - Walk the bundle's exam list in order; each exam is unlocked iff
    //     the exam before it has been graded (exam[0] is always unlocked)

    const examIds = bundle.exams.map(be => be.exam.id)

    // Set of examIds the student has at least one graded attempt for
    const completedExamIds = new Set<string>()

    if (userId && isPurchased && examIds.length > 0) {
      const gradedAttempts = await prisma.attempt.findMany({
        where: {
          userId,
          examId: { in: examIds },
          status: 'graded',
        },
        select: { examId: true },
        distinct: ['examId'],
      })
      gradedAttempts.forEach(a => completedExamIds.add(a.examId))
    }

    // ── Pricing ────────────────────────────────────────────────────────────
    const originalPrice  = bundle.price
    const discountAmount = Math.round(originalPrice * (bundle.discount / 100))
    const finalPrice     = originalPrice - discountAmount
    const savings        = discountAmount

    // ── Build exam list with unlock flags ──────────────────────────────────
    const exams = bundle.exams.map((be, index) => {
      // Exam 0 is always unlocked; exam N requires exam N-1 to be completed
      const isLocked = isPurchased
        ? index > 0 && !completedExamIds.has(bundle.exams[index - 1].exam.id)
        : false // non-purchased: lock state is irrelevant (no Start shown anyway)

      const prevExamTitle = index > 0
        ? bundle.exams[index - 1].exam.title
        : null

      return {
        id:             be.exam.id,
        title:          be.exam.title,
        slug:           be.exam.slug,
        subject:        be.exam.subject?.name || 'Multi-Subject',
        subjectSlug:    be.exam.subject?.slug || 'multi-subject',
        duration:       be.exam.durationMin,
        totalQuestions: be.exam.questions.length,
        totalMarks:     be.exam.totalMarks,
        difficulty:     be.exam.difficulty,
        price:          be.exam.price,
        isFree:         be.exam.isFree,
        totalAttempts:  be.exam._count.attempts,
        isLocked,
        isCompleted:    completedExamIds.has(be.exam.id),
        prevExamTitle,  // used for the unlock hint message
      }
    })

    return NextResponse.json({
      id:           bundle.id,
      name:         bundle.name,
      slug:         bundle.slug,
      description:  bundle.description,
      price:        finalPrice,
      originalPrice,
      discount:     bundle.discount,
      isPurchased,
      totalExams:   bundle.exams.length,
      savings,
      exams,
    })

  } catch (error) {
    return handleApiError(error)
  }
}