// src/app/api/exams/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Optional auth - works for both logged in and guest users
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    
    const { slug } = params
    
    // Fetch exam by slug
    const exam = await prisma.exam.findUnique({
      where: { 
        slug,
        isPublished: true // Only show published exams
      },
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
                },
                options: {
                  select: {
                    id: true,
                    optionKey: true,
                    text: true,
                    imageUrl: true
                    // CRITICAL: DO NOT include isCorrect field for students!
                  },
                  orderBy: { sequence: 'asc' }
                }
              }
            }
          },
          orderBy: { sequence: 'asc' }
        },
        _count: {
          select: { attempts: true }
        }
      }
    })
    
    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      )
    }
    
    // Check purchase status for logged-in users
    let isPurchased = false
    
    if (userId && !exam.isFree) {
      const purchase = await prisma.purchase.findFirst({
        where: {
          userId,
          examId: exam.id,
          status: 'active',
          validUntil: { gte: new Date() }
        }
      })
      
      isPurchased = !!purchase
    }
    
    // Get unique topics
    const topics = [...new Set(
      exam.questions.map(eq => eq.question.topic.name)
    )]
    
    // Transform response - REMOVE SENSITIVE DATA
    const response = {
      id: exam.id,
      title: exam.title,
      slug: exam.slug,
      subject: exam.subject?.name || 'Multi-Subject',
      subjectSlug: exam.subject?.slug || 'multi-subject',
      thumbnail: exam.thumbnail || null,
      duration: exam.durationMin,
      totalQuestions: exam.questions.length,
      totalMarks: exam.totalMarks,
      difficulty: exam.difficulty,
      price: exam.price,
      isFree: exam.isFree,
      isPurchased: isPurchased,
      instructions: exam.instructions,
      topics,
      totalAttempts: exam._count.attempts,
      // SECURITY: Transform questions to REMOVE correct answers
      questions: exam.questions.map(eq => ({
        id: eq.question.id,
        statement: eq.question.statement,
        imageUrl: eq.question.imageUrl,
        marks: eq.question.marks,
        difficulty: eq.question.difficulty,
        options: eq.question.options.map(opt => ({
          key: opt.optionKey,
          text: opt.text,
          imageUrl: opt.imageUrl
          // NO isCorrect field! ✅
        }))
        // NO correctAnswer field! ✅
        // NO explanation field! ✅
      }))
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    return handleApiError(error)
  }
}