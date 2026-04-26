import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const { id: bundleId } = params
    const { searchParams } = new URL(request.url)
    const page  = parseInt(searchParams.get('page')  || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip  = (page - 1) * limit

    // Verify bundle exists
    const bundle = await prisma.bundle.findUnique({
      where: { id: bundleId },
      select: { id: true, name: true },
    })
    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    const [purchases, totalCount] = await Promise.all([
      prisma.purchase.findMany({
        where: {
          bundleId,
          status: 'active',   // only successful transactions
        },
        skip,
        take: limit,
        orderBy: { purchasedAt: 'desc' },
        include: {
          user: {
            select: {
              id:    true,
              name:  true,
              email: true,
              phone: true,
              image: true,
            },
          },
          payment: {
            select: {
              amount:            true,
              razorpayPaymentId: true,
              paidAt:            true,
              method:            true,
            },
          },
        },
      }),
      prisma.purchase.count({
        where: { bundleId, status: 'active' },
      }),
    ])

    const transformed = purchases.map(p => ({
      purchaseId:        p.id,
      purchasedAt:       p.purchasedAt.toISOString(),
      validUntil:        p.validUntil?.toISOString() ?? null,
      price:             p.price,
      user: {
        id:    p.user.id,
        name:  p.user.name  ?? 'Unknown',
        email: p.user.email,
        phone: p.user.phone ?? null,
        image: p.user.image ?? null,
      },
      payment: p.payment ? {
        amount:            p.payment.amount,
        razorpayPaymentId: p.payment.razorpayPaymentId,
        paidAt:            p.payment.paidAt?.toISOString() ?? null,
        method:            p.payment.method ?? null,
      } : null,
    }))

    return NextResponse.json({
      bundleName: bundle.name,
      purchases:  transformed,
      pagination: {
        page,
        limit,
        total:      totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}