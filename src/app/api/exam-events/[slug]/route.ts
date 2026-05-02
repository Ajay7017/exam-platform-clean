import { NextRequest, NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'

// Public — no auth required
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const examEvent = await prisma.examEvent.findUnique({
      where: { slug: params.slug },
      include: {
        resources: {
          where: {
            status: { not: 'REMOVED' }  // never show REMOVED to public
          },
          orderBy: { sortOrder: 'asc' }
          },
        answerKey: true
        }
    })

    if (!examEvent || examEvent.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Exam event not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ examEvent })

  } catch (error) {
    console.error('GET /api/exam-events/[slug] error:', error)
    return handleApiError(error)
  }
}