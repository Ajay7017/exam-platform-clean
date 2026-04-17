// src/app/api/admin/users/bulk/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'User IDs are required' }, { status: 400 })
    }

    // Safety: Filter out admins so you don't accidentally delete yourself
    const validTargets = await prisma.user.findMany({
      where: { id: { in: ids }, role: { not: 'admin' } },
      select: { id: true }
    })
    const targetIds = validTargets.map(u => u.id)

    if (targetIds.length === 0) {
      return NextResponse.json({ success: true, message: 'No deletable student accounts found.' })
    }

    // Transaction to handle Foreign Key constraints (Leaderboard -> Attempt -> User)
    await prisma.$transaction([
      prisma.leaderboardEntry.deleteMany({ where: { userId: { in: targetIds } } }),
      prisma.attempt.deleteMany({ where: { userId: { in: targetIds } } }),
      prisma.purchase.deleteMany({ where: { userId: { in: targetIds } } }),
      prisma.account.deleteMany({ where: { userId: { in: targetIds } } }),
      prisma.session.deleteMany({ where: { userId: { in: targetIds } } }),
      prisma.user.deleteMany({ where: { id: { in: targetIds } } })
    ])

    return NextResponse.json({ success: true, message: `Deleted ${targetIds.length} users.` })
  } catch (error) {
    return handleApiError(error)
  }
}

// Added "More Features": Bulk Role Update
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin()
    const { ids, role } = await request.json()

    await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { role }
    })

    return NextResponse.json({ success: true, message: `Updated roles to ${role}.` })
  } catch (error) {
    return handleApiError(error)
  }
}