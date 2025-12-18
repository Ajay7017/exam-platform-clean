// src/app/api/attempts/[id]/violation/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const violationSchema = z.object({
  type: z.string(), // Made more flexible
  details: z.string().optional(),
  count: z.number().optional(),
  timestamp: z.string().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { type, details, count, timestamp } = violationSchema.parse(body)
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

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json({ 
        error: 'Attempt not active',
        success: true // Return success to prevent repeated calls
      }, { status: 200 })
    }

    // Update violation records
    const flags = (attempt.suspiciousFlags as any[]) || []
    flags.push({
      type,
      details,
      timestamp: timestamp || new Date().toISOString(),
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
    console.error('Violation API error:', error)
    return NextResponse.json(
      { error: 'Failed to log violation', success: false },
      { status: 500 }
    )
  }
}