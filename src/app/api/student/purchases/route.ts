// src/app/api/student/purchases/route.ts
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    // Single query — fetch all active purchases for the user.
    // We include both exam and bundle relations; exactly one will be non-null
    // per row depending on purchase.type.
    const purchases = await prisma.purchase.findMany({
      where: {
        userId,
        status: 'active',
      },
      include: {
        // For type = "exam"
        exam: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
            durationMin: true,
            totalMarks: true,
            difficulty: true,
            isFree: true,
            subject: {
              select: { name: true, slug: true },
            },
            questions: { select: { id: true } },
          },
        },
        // For type = "bundle"
        bundle: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            price: true,
            discount: true,
            exams: {
              select: {
                exam: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    subject: { select: { name: true } },
                    durationMin: true,
                    difficulty: true,
                    questions: { select: { id: true } },
                  },
                },
              },
            },
          },
        },
        // Payment info — may be null for free exams
        payment: {
          select: {
            razorpayPaymentId: true,
            method: true,
            paidAt: true,
            amount: true,
          },
        },
      },
      orderBy: { purchasedAt: 'desc' },
    })

    // ── Shape exam purchases ──────────────────────────────────────────────
    const examPurchases = purchases
      .filter((p) => p.type === 'exam' && p.exam !== null)
      .map((p) => ({
        id: p.id,
        type: 'exam' as const,
        purchasedAt: p.purchasedAt.toISOString(),
        validUntil: p.validUntil ? p.validUntil.toISOString() : null,
        price: p.price,
        status: p.status,
        payment: p.payment
          ? {
              razorpayPaymentId: p.payment.razorpayPaymentId,
              method: p.payment.method,
              paidAt: p.payment.paidAt ? p.payment.paidAt.toISOString() : null,
            }
          : null,
        exam: {
          id: p.exam!.id,
          title: p.exam!.title,
          slug: p.exam!.slug,
          thumbnail: p.exam!.thumbnail ?? null,
          duration: p.exam!.durationMin,
          totalQuestions: p.exam!.questions.length,
          totalMarks: p.exam!.totalMarks,
          difficulty: p.exam!.difficulty,
          isFree: p.exam!.isFree,
          subject: p.exam!.subject?.name ?? 'Multi-Subject',
          subjectSlug: p.exam!.subject?.slug ?? 'multi-subject',
        },
      }))

    // ── Shape bundle purchases ────────────────────────────────────────────
    const bundlePurchases = purchases
      .filter((p) => p.type === 'bundle' && p.bundle !== null)
      .map((p) => {
        const bundle = p.bundle!
        const includedExams = bundle.exams.map((be) => ({
          id: be.exam.id,
          title: be.exam.title,
          slug: be.exam.slug,
          subject: be.exam.subject?.name ?? 'Multi-Subject',
          duration: be.exam.durationMin,
          totalQuestions: be.exam.questions.length,
          difficulty: be.exam.difficulty,
        }))

        return {
          id: p.id,
          type: 'bundle' as const,
          purchasedAt: p.purchasedAt.toISOString(),
          validUntil: null, // bundles are lifetime
          price: p.price,
          status: p.status,
          payment: p.payment
            ? {
                razorpayPaymentId: p.payment.razorpayPaymentId,
                method: p.payment.method,
                paidAt: p.payment.paidAt ? p.payment.paidAt.toISOString() : null,
              }
            : null,
          bundle: {
            id: bundle.id,
            name: bundle.name,
            slug: bundle.slug,
            description: bundle.description ?? null,
            price: bundle.price,
            discount: bundle.discount,
            totalExams: includedExams.length,
            exams: includedExams,
          },
        }
      })

    return NextResponse.json({
      examPurchases,
      bundlePurchases,
      totals: {
        exams: examPurchases.length,
        bundles: bundlePurchases.length,
      },
    })
  } catch (error) {
    console.error('Failed to fetch purchases:', error)
    return handleApiError(error)
  }
}