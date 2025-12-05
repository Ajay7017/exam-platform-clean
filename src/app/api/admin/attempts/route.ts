// src/app/api/admin/attempts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || undefined
    const examId = searchParams.get('examId') || undefined
    
    const where: any = {}
    if (status) where.status = status
    if (examId) where.examId = examId
    
    const [attempts, total] = await Promise.all([
      prisma.attempt.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          exam: {
            select: { id: true, title: true, slug: true }
          }
        },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.attempt.count({ where })
    ])

    return NextResponse.json({
      attempts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    return handleApiError(error)
  }
}