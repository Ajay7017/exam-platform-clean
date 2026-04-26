// src/app/api/admin/bundles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createBundleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens only'),
  description: z.string().optional(),
  price: z.number().int().min(0, 'Price must be non-negative'),
  discount: z.number().int().min(0).max(100).default(0),
  validityDays: z.number().int().min(1).default(365),
  examIds: z.array(z.string()).min(1, 'At least one exam is required'),
  thumbnail: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [bundles, totalCount] = await Promise.all([
      prisma.bundle.findMany({
        where,
        skip,
        take: limit,
        include: {
          exams: {
            include: {
              exam: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  isFree: true,
                  price: true,
                  subject: { select: { name: true } },
                },
              },
            },
          },
          _count: {
            select: {
              purchases: {
                where: { status: 'active' },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bundle.count({ where }),
    ])

    const transformed = bundles.map(bundle => {
      const discountAmount = Math.round(bundle.price * (bundle.discount / 100))
      const finalPrice = bundle.price - discountAmount
      const totalMarketValue = bundle.exams.reduce((sum, be) => sum + be.exam.price, 0)

      return {
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
        totalExams: bundle.exams.length,
        totalPurchases: bundle._count.purchases,
        examTitles: bundle.exams.map(be => be.exam.title),
        createdAt: bundle.createdAt.toISOString(),
      }
    })

    return NextResponse.json({
      bundles: transformed,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + bundles.length < totalCount,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const validated = createBundleSchema.parse(body)

    // Check slug uniqueness
    const existing = await prisma.bundle.findUnique({ where: { slug: validated.slug } })
    if (existing) {
      return NextResponse.json({ error: 'A bundle with this slug already exists' }, { status: 400 })
    }

    // Verify all exams exist — no isPublished filter, bundles can include draft exams
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

    const bundle = await prisma.bundle.create({
      data: {
        name: validated.name,
        slug: validated.slug,
        description: validated.description,
        price: validated.price,
        discount: validated.discount,
        validityDays: validated.validityDays,
        isActive: false,
        ...(validated.thumbnail && { thumbnail: validated.thumbnail }),
        exams: {
          create: validated.examIds.map(examId => ({ examId })),
        },
      } as any,
      include: {
        _count: { select: { exams: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Bundle created successfully',
      bundle: {
        id: bundle.id,
        name: bundle.name,
        slug: bundle.slug,
        isActive: bundle.isActive,
        totalExams: bundle._count.exams,
        createdAt: bundle.createdAt.toISOString(),
      },
    }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}