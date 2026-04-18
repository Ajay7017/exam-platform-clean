// src/app/api/bundles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = { isActive: true }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
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
                  durationMin: true,
                  totalMarks: true,
                  difficulty: true,
                  isFree: true,
                  subject: { select: { name: true, slug: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bundle.count({ where }),
    ])

    // Check which bundles the user has purchased
    let purchasedBundleIds = new Set<string>()
    if (userId) {
      const purchases = await prisma.purchase.findMany({
        where: {
          userId,
          bundleId: { in: bundles.map(b => b.id) },
          status: 'active',
          OR: [
            { validUntil: null },
            { validUntil: { gte: new Date() } },
          ],
        },
        select: { bundleId: true },
      })
      purchasedBundleIds = new Set(purchases.map(p => p.bundleId!))
    }

    const transformed = bundles.map(bundle => {
      const originalPrice = bundle.price // price is already in paise
      const discountAmount = Math.round(originalPrice * (bundle.discount / 100))
      const finalPrice = originalPrice - discountAmount

      return {
        id: bundle.id,
        name: bundle.name,
        slug: bundle.slug,
        description: bundle.description,
        price: finalPrice,
        originalPrice,
        discount: bundle.discount,
        totalExams: bundle.exams.length,
        isPurchased: purchasedBundleIds.has(bundle.id),
        examTitles: bundle.exams.slice(0, 3).map(be => be.exam.title),
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