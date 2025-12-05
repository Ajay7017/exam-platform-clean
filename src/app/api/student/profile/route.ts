// src/app/api/student/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-error'

// GET - Fetch user profile with stats
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // 1. Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        phoneVerified: true,
        role: true,
        createdAt: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 2. ✅ FIXED: Calculate GLOBAL rank based on cumulative score
    const allUserScores = await prisma.leaderboardEntry.groupBy({
      by: ['userId'],
      _sum: {
        score: true
      }
    })

    const sortedScores = allUserScores
      .map(u => ({
        userId: u.userId,
        totalScore: u._sum.score || 0
      }))
      .sort((a, b) => b.totalScore - a.totalScore)

    const userRankIndex = sortedScores.findIndex(u => u.userId === userId)
    const globalRank = userRankIndex >= 0 ? userRankIndex + 1 : null

    // 3. Calculate accuracy (correct answers / total answered)
    const completedAttempts = await prisma.attempt.findMany({
      where: {
        userId,
        status: 'completed'
      },
      select: {
        correctAnswers: true,
        wrongAnswers: true,
        totalQuestions: true
      }
    })

    const totalCorrect = completedAttempts.reduce((sum, a) => sum + (a.correctAnswers || 0), 0)
    const totalAnswered = completedAttempts.reduce((sum, a) => 
      sum + (a.correctAnswers || 0) + (a.wrongAnswers || 0), 0
    )
    const accuracy = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0

    // 4. Calculate total time spent
    const timeSpentResult = await prisma.attempt.aggregate({
      where: {
        userId,
        status: 'completed'
      },
      _sum: {
        timeSpentSec: true
      }
    })

    const totalTimeSpentSec = timeSpentResult._sum.timeSpentSec || 0
    const totalTimeHours = Math.floor(totalTimeSpentSec / 3600)

    // 5. Calculate streak (consecutive days with attempts)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let streak = 0
    let currentDate = new Date(today)
    
    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(currentDate)
      const dayEnd = new Date(currentDate)
      dayEnd.setHours(23, 59, 59, 999)
      
      const attemptsOnDay = await prisma.attempt.count({
        where: {
          userId,
          status: 'completed',
          submittedAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      })
      
      if (attemptsOnDay > 0) {
        streak++
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        break
      }
    }

    // 6. Get total exams taken
    const totalExams = await prisma.attempt.count({
      where: {
        userId,
        status: 'completed'
      }
    })

    // 7. Calculate achievements
    const avgScore = completedAttempts.length > 0
      ? completedAttempts.reduce((sum, a) => {
          const answered = (a.correctAnswers || 0) + (a.wrongAnswers || 0)
          const percentage = answered > 0 ? ((a.correctAnswers || 0) / a.totalQuestions) * 100 : 0
          return sum + percentage
        }, 0) / completedAttempts.length
      : 0

    const perfectScores = completedAttempts.filter(a => {
      const answered = (a.correctAnswers || 0) + (a.wrongAnswers || 0)
      return answered === a.totalQuestions && a.wrongAnswers === 0
    }).length

    const achievements = {
      perfectScore: perfectScores > 0,
      speedDemon: false, // You can implement based on time criteria
      weekStreak: streak >= 7,
      fiftyExams: totalExams >= 50,
      top100: globalRank ? globalRank <= 100 : false,
      allRounder: false, // You can implement based on subjects
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        role: user.role,
        memberSince: user.createdAt
      },
      stats: {
        rank: globalRank,
        accuracy: Math.round(accuracy * 10) / 10,
        timeSpent: totalTimeHours,
        streak,
        totalExams
      },
      achievements
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, phone } = body

    // Validate phone number (Indian format)
    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Please enter a valid 10-digit Indian mobile number.' },
        { status: 400 }
      )
    }

    // Check if phone is already taken by another user
    if (phone) {
      const existingUser = await prisma.user.findFirst({
        where: {
          phone,
          NOT: { id: session.user.id }
        }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'This phone number is already registered.' },
          { status: 400 }
        )
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || undefined,
        phone: phone || undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        phoneVerified: true,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    })

  } catch (error) {
    return handleApiError(error)
  }
}