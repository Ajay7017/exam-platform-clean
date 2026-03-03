import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bulkIdsSchema = z.object({
  ids: z.array(z.string()).min(1),
})

const bulkToggleSchema = z.object({
  ids: z.array(z.string()).min(1),
  isActive: z.boolean(),
})

// PATCH: Bulk toggle isActive
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const { ids, isActive } = bulkToggleSchema.parse(body)

    await prisma.question.updateMany({
      where: { id: { in: ids } },
      data: { isActive },
    })

    return NextResponse.json({
      success: true,
      updated: ids.length,
      message: `${ids.length} question(s) marked as ${isActive ? 'Active' : 'Inactive'}`,
    })
  } catch (error) {
    console.error('BULK TOGGLE ERROR:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update questions' }, { status: 500 })
  }
}

// DELETE: Bulk delete — skips questions used in exams
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const { ids } = bulkIdsSchema.parse(body)

    const questions = await prisma.question.findMany({
      where: { id: { in: ids } },
      include: { _count: { select: { examQuestions: true } } },
    })

    const skipped: string[] = []
    const toDelete: string[] = []

    for (const q of questions) {
      if (q._count.examQuestions > 0) skipped.push(q.id)
      else toDelete.push(q.id)
    }

    if (toDelete.length > 0) {
      await prisma.question.deleteMany({ where: { id: { in: toDelete } } })
    }

    return NextResponse.json({
      success: true,
      deleted: toDelete.length,
      skipped: skipped.length,
      message: skipped.length > 0
        ? `${toDelete.length} deleted, ${skipped.length} skipped (used in exams)`
        : `${toDelete.length} question(s) deleted successfully`,
    })
  } catch (error) {
    console.error('BULK DELETE ERROR:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to delete questions' }, { status: 500 })
  }
}