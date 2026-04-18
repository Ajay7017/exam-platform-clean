// src/app/api/admin/bundles/[id]/publish/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  isActive: z.boolean(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { isActive } = schema.parse(body)

    const bundle = await prisma.bundle.findUnique({
      where: { id: params.id },
      include: { _count: { select: { exams: true } } },
    })

    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    // Must have at least one exam to activate
    if (isActive && bundle._count.exams === 0) {
      return NextResponse.json(
        { error: 'Cannot activate bundle without exams' },
        { status: 400 }
      )
    }

    const updated = await prisma.bundle.update({
      where: { id: params.id },
      data: { isActive },
      select: { id: true, name: true, slug: true, isActive: true },
    })

    return NextResponse.json({
      success: true,
      message: isActive ? 'Bundle activated successfully' : 'Bundle deactivated successfully',
      bundle: updated,
    })
  } catch (error) {
    return handleApiError(error)
  }
}