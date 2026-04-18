// src/app/api/exams/[slug]/route.ts
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
    const userId = session?.user?.id
    const { slug } = params

    // ── Step 1: try published exam first (normal path) ────────────────────
    let exam = await prisma.exam.findUnique({
      where: { slug, isPublished: true },
      include: {
        subject: { select: { name: true, slug: true } },
        questions: {
          include: {
            question: {
              include: {
                topic: { select: { name: true, subject: { select: { name: true } } } },
                options: {
                  select: { id: true, optionKey: true, text: true, imageUrl: true },
                  orderBy: { sequence: 'asc' },
                },
              },
            },
          },
          orderBy: { sequence: 'asc' },
        },
        _count: { select: { attempts: true } },
      },
    })

    // ── Step 2: if not published, check bundle ownership ──────────────────
    // An unpublished exam can be accessed if the student owns a bundle
    // that contains it (bundle-only / exclusive exam).
    let isBundleOnlyExam = false

    if (!exam && userId) {
      // Find the exam by slug without isPublished filter
      const draftExam = await prisma.exam.findUnique({
        where: { slug },
        select: { id: true },
      })

      if (draftExam) {
        // Check if student has an active bundle purchase containing this exam
        const bundlePurchase = await prisma.purchase.findFirst({
          where: {
            userId,
            type: 'bundle',
            status: 'active',
            OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
            bundle: { exams: { some: { examId: draftExam.id } } },
          },
        })

        if (bundlePurchase) {
          // Student owns this exam via bundle — fetch full exam details
          exam = await prisma.exam.findUnique({
            where: { slug },
            include: {
              subject: { select: { name: true, slug: true } },
              questions: {
                include: {
                  question: {
                    include: {
                      topic: { select: { name: true, subject: { select: { name: true } } } },
                      options: {
                        select: { id: true, optionKey: true, text: true, imageUrl: true },
                        orderBy: { sequence: 'asc' },
                      },
                    },
                  },
                },
                orderBy: { sequence: 'asc' },
              },
              _count: { select: { attempts: true } },
            },
          })
          isBundleOnlyExam = true
        }
      }
    }

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    // ── Purchase check ────────────────────────────────────────────────────
    let isPurchased = false

    if (userId && !exam.isFree) {
      if (isBundleOnlyExam) {
        // Already verified bundle ownership above
        isPurchased = true
      } else {
        const now = new Date()

        // 1. Direct exam purchase
        const directPurchase = await prisma.purchase.findFirst({
          where: {
            userId,
            examId: exam.id,
            status: 'active',
            validUntil: { gte: now },
          },
        })

        if (directPurchase) {
          isPurchased = true
        } else {
          // 2. Bundle ownership
          const bundlePurchase = await prisma.purchase.findFirst({
            where: {
              userId,
              type: 'bundle',
              status: 'active',
              OR: [{ validUntil: null }, { validUntil: { gte: now } }],
              bundle: { exams: { some: { examId: exam.id } } },
            },
          })
          isPurchased = !!bundlePurchase
        }
      }
    }

    const topics = [...new Set(exam.questions.map((eq) => eq.question.topic.name))]

    const response = {
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
      price: exam.price,
      isFree: exam.isFree,
      isPurchased,
      instructions: exam.instructions,
      topics,
      totalAttempts: exam._count.attempts,
      questions: exam.questions.map((eq) => ({
        id: eq.question.id,
        statement: eq.question.statement,
        imageUrl: eq.question.imageUrl,
        marks: eq.question.marks,
        difficulty: eq.question.difficulty,
        options: eq.question.options.map((opt) => ({
          key: opt.optionKey,
          text: opt.text,
          imageUrl: opt.imageUrl,
          // NO isCorrect field! ✅
        })),
        // NO correctAnswer field! ✅
        // NO explanation field! ✅
      })),
    }

    return NextResponse.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}