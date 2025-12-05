// src/app/api/attempts/[id]/violation/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const violationSchema = z.object({
  type: z.enum([
    'tab_switch', 
    'window_blur', 
    'devtools', 
    'copy_attempt', 
    'right_click',
    'fullscreen_exit',
    'back_navigation',
    'refresh_attempt',
    'paste_attempt',
    'cut_attempt'
  ]),
  details: z.string().optional(),
  count: z.number().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { type, details, count } = violationSchema.parse(body)
    const attemptId = params.id

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: {
        userId: true,
        status: true,
        tabSwitchCount: true,
        suspiciousFlags: true
      }
    })

    if (!attempt || attempt.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json({ error: 'Attempt not active' }, { status: 400 })
    }

    // Update violation records
    const flags = (attempt.suspiciousFlags as any[]) || []
    flags.push({
      type,
      details,
      timestamp: new Date().toISOString(),
      count
    })

    const updates: any = {
      suspiciousFlags: flags
    }

    if (type === 'tab_switch' || type === 'window_blur') {
      updates.tabSwitchCount = attempt.tabSwitchCount + 1
    }

    await prisma.attempt.update({
      where: { id: attemptId },
      data: updates
    })

    const totalViolations = flags.length
    const tabSwitchCount = updates.tabSwitchCount || attempt.tabSwitchCount
    
    return NextResponse.json({
      success: true,
      violationCount: totalViolations,
      tabSwitchCount: tabSwitchCount,
      shouldTerminate: totalViolations >= 3,
      warning: totalViolations === 1 
        ? 'First Warning: Please follow exam rules. You have 2 warnings remaining.' 
        : totalViolations === 2 
        ? 'Second Warning: This is your last warning. Next violation will terminate your exam.'
        : totalViolations >= 3
        ? 'Exam terminated due to multiple violations.'
        : null
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to log violation' },
      { status: 500 }
    )
  }
}