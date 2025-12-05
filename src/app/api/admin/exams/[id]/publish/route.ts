// src/app/api/admin/exams/[id]/publish/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { publishExamSchema } from '@/lib/validations/exam'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    
    const body = await request.json()
    const { isPublished } = publishExamSchema.parse(body)
    
    // Check if exam exists
    const exam = await prisma.exam.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    })
    
    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      )
    }
    
    // Validate exam has questions before publishing
    if (isPublished && exam._count.questions === 0) {
      return NextResponse.json(
        { error: 'Cannot publish exam without questions' },
        { status: 400 }
      )
    }
    
    // Update publish status
    const updatedExam = await prisma.exam.update({
      where: { id: params.id },
      data: { isPublished },
      select: {
        id: true,
        title: true,
        slug: true,
        isPublished: true
      }
    })
    
    return NextResponse.json({
      success: true,
      message: isPublished 
        ? 'Exam published successfully' 
        : 'Exam unpublished successfully',
      exam: updatedExam
    })
    
  } catch (error) {
    return handleApiError(error)
  }
}