//src/app/api/exam-events/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic' // ← add this line

// Public — no auth required
export async function GET(request: NextRequest) {
    try {
        const examEvents = await prisma.examEvent.findMany({
            where: { status: 'PUBLISHED' },
            orderBy: { examDate: 'desc' },
            select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                examDate: true,
                metaTitle: true,
                metaDescription: true,
                popupEnabled: true,
                popupMessage: true,
                popupLinkLabel: true,
                _count: {
                    select: { resources: true }
                }
            }
        })

        return NextResponse.json({ examEvents })

    } catch (error) {
        console.error('GET /api/exam-events error:', error)
        return handleApiError(error)
    }
}