// src/app/api/subjects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-error'

export async function GET(request: NextRequest) {
  try {
    const subjects = await prisma.subject.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      subjects,
      total: subjects.length
    })
  } catch (error) {
    return handleApiError(error)
  }
}