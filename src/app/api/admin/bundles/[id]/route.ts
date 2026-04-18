// src/app/api/admin/bundles/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateBundleSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional().nullable(),
  price: z.number().int().min(0).optional(),
  discount: z.number().int().min(0).max(100).optional(),
  validityDays: z.number().int().min(1).optional(),
  examIds: z.array(z.string()).min(1).optional(),
  thumbnail: z.string().optional().nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const bundle = await prisma.bundle.findUnique({
      where: { id: params.id },
      include: {
        exams: {
          include: {
            exam: {
              select: {
                id: true,
                title: true,
                slug: true,
                price: true,
                isFree: true,
                isPublished: true,
                difficulty: true,
                durationMin: true,
                totalMarks: true,
                subject: { select: { name: true, slug: true } },
                _count: { select: { questions: true } },
              },
            },
          },
        },
        _count: { select: { purchases: true } },
      },
    })

    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    const discountAmount = Math.round(bundle.price * (bundle.discount / 100))
    const finalPrice = bundle.price - discountAmount
    const totalMarketValue = bundle.exams.reduce((sum, be) => sum + be.exam.price, 0)

    return NextResponse.json({
      id: bundle.id,
      name: bundle.name,
      slug: bundle.slug,
      description: bundle.description,
      thumbnail: (bundle as any).thumbnail || null,
      price: bundle.price,
      discount: bundle.discount,
      finalPrice,
      totalMarketValue,
      savings: Math.max(0, totalMarketValue - finalPrice),
      validityDays: bundle.validityDays,
      isActive: bundle.isActive,
      totalPurchases: bundle._count.purchases,
      createdAt: bundle.createdAt.toISOString(),
      exams: bundle.exams.map(be => ({
        id: be.exam.id,
        title: be.exam.title,
        slug: be.exam.slug,
        price: be.exam.price,
        isFree: be.exam.isFree,
        isPublished: be.exam.isPublished,
        difficulty: be.exam.difficulty,
        duration: be.exam.durationMin,
        totalMarks: be.exam.totalMarks,
        totalQuestions: be.exam._count.questions,
        subject: be.exam.subject?.name || 'Multi-Subject',
        subjectSlug: be.exam.subject?.slug || 'multi-subject',
      })),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const body = await request.json()
    const validated = updateBundleSchema.parse(body)

    const existing = await prisma.bundle.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    // Slug uniqueness check
    if (validated.slug && validated.slug !== existing.slug) {
      const slugConflict = await prisma.bundle.findUnique({ where: { slug: validated.slug } })
      if (slugConflict) {
        return NextResponse.json({ error: 'A bundle with this slug already exists' }, { status: 400 })
      }
    }

    // Verify exams exist — no isPublished filter, bundles can include draft exams
    if (validated.examIds) {
      const exams = await prisma.exam.findMany({
        where: { id: { in: validated.examIds } },
        select: { id: true },
      })
      if (exams.length !== validated.examIds.length) {
        return NextResponse.json(
          { error: `Only ${exams.length} of ${validated.examIds.length} exams were found.` },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.slug !== undefined) updateData.slug = validated.slug
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.price !== undefined) updateData.price = validated.price
    if (validated.discount !== undefined) updateData.discount = validated.discount
    if (validated.validityDays !== undefined) updateData.validityDays = validated.validityDays
    if (validated.thumbnail !== undefined) updateData.thumbnail = validated.thumbnail

    // Replace exams if provided
    if (validated.examIds) {
      await prisma.bundleExam.deleteMany({ where: { bundleId: params.id } })
      updateData.exams = {
        create: validated.examIds.map(examId => ({ examId })),
      }
    }

    const bundle = await prisma.bundle.update({
      where: { id: params.id },
      data: updateData,
      include: {
        _count: { select: { exams: true, purchases: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Bundle updated successfully',
      bundle: {
        id: bundle.id,
        name: bundle.name,
        slug: bundle.slug,
        isActive: bundle.isActive,
        totalExams: bundle._count.exams,
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const bundle = await prisma.bundle.findUnique({
      where: { id: params.id },
      include: { _count: { select: { purchases: true } } },
    })

    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    if (bundle._count.purchases > 0) {
      return NextResponse.json(
        { error: 'Cannot delete bundle with existing purchases. Deactivate it instead.' },
        { status: 400 }
      )
    }

    await prisma.bundle.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true, message: 'Bundle deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}