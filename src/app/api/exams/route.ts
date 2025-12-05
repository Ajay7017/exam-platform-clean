// src/app/api/exams/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { examFiltersSchema } from '@/lib/validations/exam'

export async function GET(request: NextRequest) {
  try {
    // Optional auth - works for both logged in and guest users
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    
    const { searchParams } = new URL(request.url)
    const filters = examFiltersSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      subject: searchParams.get('subject'),
      difficulty: searchParams.get('difficulty'),
      search: searchParams.get('search')
    })
    
    const { page, limit, subject, difficulty, search } = filters
    const skip = (page - 1) * limit
    
    // Build where clause - only show published exams
    const where: any = { isPublished: true }
    
    // FIXED: Handle subject filter properly for both single and multi-subject exams
    if (subject) {
      where.subject = { slug: subject }
    }
    
    if (difficulty) {
      where.difficulty = difficulty
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    // Fetch exams with counts
    const [exams, totalCount] = await Promise.all([
      prisma.exam.findMany({
        where,
        skip,
        take: limit,
        include: {
          subject: {
            select: { name: true, slug: true }
          },
          questions: {
            include: {
              question: {
                include: {
                  topic: {
                    select: { name: true, subject: { select: { name: true } } }
                  }
                }
              }
            }
          },
          _count: {
            select: {
              attempts: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.exam.count({ where })
    ])
    
    // Check purchase status for logged-in users
    let purchaseMap: Record<string, boolean> = {}
    
    if (userId) {
      const purchases = await prisma.purchase.findMany({
        where: {
          userId,
          examId: { in: exams.map(e => e.id) },
          status: 'active',
          validUntil: { gte: new Date() }
        },
        select: { examId: true }
      })
      
      purchaseMap = purchases.reduce((acc, p) => {
        acc[p.examId] = true
        return acc
      }, {} as Record<string, boolean>)
    }
    
    // Get unique topics for each exam
    const transformedExams = exams.map(exam => {
      const topics = [...new Set(
        exam.questions.map(eq => eq.question.topic.name)
      )]
      
      // FIXED: Handle multi-subject exams
      const subjectName = exam.subject?.name || 'Multi-Subject'
      const subjectSlug = exam.subject?.slug || 'multi-subject'
      
      return {
        id: exam.id,
        title: exam.title,
        slug: exam.slug,
        subject: subjectName,
        subjectSlug: subjectSlug,
        thumbnail: exam.thumbnail || '/default-exam-thumbnail.jpg',
        duration: exam.durationMin,
        totalQuestions: exam.questions.length,
        totalMarks: exam.totalMarks,
        difficulty: exam.difficulty,
        price: exam.price,
        isFree: exam.isFree,
        isPurchased: purchaseMap[exam.id] || false,
        topics,
        totalAttempts: exam._count.attempts
      }
    })
    
    return NextResponse.json({
      exams: transformedExams,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + exams.length < totalCount
      }
    })
    
  } catch (error) {
    return handleApiError(error)
  }
}