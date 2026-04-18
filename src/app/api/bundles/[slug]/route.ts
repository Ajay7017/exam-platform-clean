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
    const userId = session?.user?.id
    const { slug } = params

    const bundle = await prisma.bundle.findUnique({
      where: { slug },
      include: {
        exams: {
          include: {
            exam: {
              select: {
                id: true,
                title: true,
                slug: true,
                durationMin: true,
                totalMarks: true,
                difficulty: true,
                isFree: true,
                price: true,
                subject: { select: { name: true, slug: true } },
                _count: { select: { attempts: true } },
                questions: { select: { id: true } },
              },
            },
          },
        },
      },
    })

    if (!bundle || !bundle.isActive) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    // Check purchase status
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

    const originalPrice = bundle.price
    const discountAmount = Math.round(originalPrice * (bundle.discount / 100))
    const finalPrice = originalPrice - discountAmount

    // Total market value = sum of individual exam prices
    const totalMarketValue = bundle.exams.reduce(
      (sum, be) => sum + be.exam.price,
      0
    )

    const transformed = {
      id: bundle.id,
      name: bundle.name,
      slug: bundle.slug,
      description: bundle.description,
      price: finalPrice,
      originalPrice,
      discount: bundle.discount,
      isPurchased,
      totalExams: bundle.exams.length,
      totalMarketValue,
      savings: totalMarketValue - finalPrice,
      exams: bundle.exams.map(be => ({
        id: be.exam.id,
        title: be.exam.title,
        slug: be.exam.slug,
        subject: be.exam.subject?.name || 'Multi-Subject',
        subjectSlug: be.exam.subject?.slug || 'multi-subject',
        duration: be.exam.durationMin,
        totalQuestions: be.exam.questions.length,
        totalMarks: be.exam.totalMarks,
        difficulty: be.exam.difficulty,
        price: be.exam.price,
        isFree: be.exam.isFree,
        totalAttempts: be.exam._count.attempts,
      })),
    }

    return NextResponse.json(transformed)
  } catch (error) {
    return handleApiError(error)
  }
}