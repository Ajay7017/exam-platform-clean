// src/app/api/admin/attempts/[id]/route.ts
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
    
    const attempt = await prisma.attempt.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        exam: {
          include: {
            questions: {
              include: {
                question: {
                  include: {
                    options: true,
                    topic: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!attempt) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(attempt)

  } catch (error) {
    return handleApiError(error)
  }
}

// Flag as suspicious
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const body = await request.json()
    
    const attempt = await prisma.attempt.update({
      where: { id: params.id },
      data: {
        suspiciousFlags: body.suspiciousFlags
      }
    })

    return NextResponse.json(attempt)

  } catch (error) {
    return handleApiError(error)
  }
}