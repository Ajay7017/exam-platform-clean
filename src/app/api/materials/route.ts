// src/app/api/materials/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

// GET only published materials for the public marketing page
export async function GET(request: NextRequest) {
  try {
    const materials = await prisma.studyMaterial.findMany({
      where: {
        isPublished: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ materials })

  } catch (error) {
    console.error('GET /api/materials error:', error)
    return handleApiError(error)
  }
}