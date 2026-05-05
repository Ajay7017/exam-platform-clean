//src/app/api/exam-events/[slug]/resources/[resourceId]/download/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string; resourceId: string } }
) {
  try {
    await prisma.examEventResource.update({
      where: { id: params.resourceId },
      data: { downloadCount: { increment: 1 } },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false })
  }
}