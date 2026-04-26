// src/app/api/admin/questions/compute-hash/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { computeQuestionHash } from '@/lib/question-parser'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const {
      questionType,
      statement,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswerExact,
      correctAnswerMin,
      correctAnswerMax,
      matchPairs,
    } = body

    if (!questionType || !statement) {
      return NextResponse.json({ hash: null })
    }

    const hash = computeQuestionHash({
      questionType,
      statement,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswerExact,
      correctAnswerMin,
      correctAnswerMax,
      matchPairs,
    })

    return NextResponse.json({ hash })

  } catch (error) {
    // Non-fatal — return null hash so form continues normally
    return NextResponse.json({ hash: null })
  }
}