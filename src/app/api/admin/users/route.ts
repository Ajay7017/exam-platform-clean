// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  try {
    // 1. Security Check
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Fetch Users
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            attempts: true, // Count how many exams they have taken
          },
        },
      },
    });

    // 3. Format data for frontend
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name || 'Unknown',
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      examsTaken: user._count.attempts,
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}