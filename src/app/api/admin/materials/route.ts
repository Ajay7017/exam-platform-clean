// src/app/api/admin/materials/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { createMaterialSchema } from '@/lib/validations/material'

// GET all materials for the admin dashboard
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const [materials, totalCount] = await Promise.all([
      prisma.studyMaterial.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.studyMaterial.count()
    ])

    return NextResponse.json({
      materials,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    console.error('GET /api/admin/materials error:', error)
    return handleApiError(error)
  }
}

// POST a new material
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const validated = createMaterialSchema.parse(body)

    const material = await prisma.studyMaterial.create({
      data: {
        title: validated.title,
        description: validated.description,
        subject: validated.subject,
        type: validated.type,
        link: validated.link,
        thumbnailUrl: validated.thumbnailUrl || null,
        isPublished: validated.isPublished
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Material created successfully',
      material
    }, { status: 201 })

  } catch (error) {
    return handleApiError(error)
  }
}