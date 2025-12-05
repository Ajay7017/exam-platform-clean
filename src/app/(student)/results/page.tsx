// src/app/(student)/results/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Clock, Trophy, Target, TrendingUp, 
  Eye, Download, Share2 
} from 'lucide-react'

export default async function ResultsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  // Fetch user's completed attempts
  const attempts = await prisma.attempt.findMany({
    where: {
      userId: session.user.id,
      status: 'completed'
    },
    include: {
      exam: {
        select: {
          title: true,
          totalMarks: true
        }
      }
    },
    orderBy: {
      submittedAt: 'desc'
    }
  })

  // Calculate statistics
  const totalExams = attempts.length
  const avgScore = totalExams > 0
    ? attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalExams
    : 0
  
  // ✅ FIXED: Get GLOBAL rank based on cumulative score
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

  const userRankIndex = sortedScores.findIndex(u => u.userId === session.user.id)
  const globalRank = userRankIndex >= 0 ? userRankIndex + 1 : null

  const totalTimeSpent = attempts.reduce((sum, a) => sum + (a.timeSpentSec || 0), 0)
  const totalHours = (totalTimeSpent / 3600).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Results</h1>
        <p className="text-muted-foreground mt-2">
          View your performance history and track your progress
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Exams</p>
                <p className="text-2xl font-bold">{totalExams}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Trophy className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold">{avgScore.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Global Rank</p>
                <p className="text-2xl font-bold">
                  {globalRank ? `#${globalRank}` : 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Time Spent</p>
                <p className="text-2xl font-bold">{totalHours}h</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results List */}
      {totalExams === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No results yet</h3>
            <p className="text-muted-foreground mb-6">
              Take your first exam to see your results here
            </p>
            <Button asChild>
              <Link href="/exams">Browse Exams</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {attempts.map((attempt) => {
            const completedDate = attempt.submittedAt ? new Date(attempt.submittedAt) : new Date()
            const percentage = attempt.percentage || 0
            const accuracy = attempt.totalQuestions > 0
              ? ((attempt.correctAnswers || 0) / attempt.totalQuestions) * 100
              : 0

            return (
              <Card key={attempt.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Left: Exam Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-semibold">{attempt.exam.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Completed on {completedDate.toLocaleDateString('en-US', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <Badge 
                          variant={percentage >= 80 ? 'default' : percentage >= 60 ? 'secondary' : 'destructive'}
                          className="text-base px-3 py-1"
                        >
                          {percentage.toFixed(1)}%
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Score</p>
                          <p className="font-semibold">
                            {attempt.score?.toFixed(0) || 0}/{attempt.exam.totalMarks}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Exam Rank</p>
                          <p className="font-semibold">
                            {/* ✅ FIXED: Shows exam-specific rank, not global */}
                            {attempt.rank ? `#${attempt.rank}` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Percentile</p>
                          <p className="font-semibold">
                            {attempt.percentile ? `${attempt.percentile.toFixed(1)}%` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Accuracy</p>
                          <p className="font-semibold">{accuracy.toFixed(1)}%</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span>{attempt.correctAnswers || 0} Correct</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span>{attempt.wrongAnswers || 0} Wrong</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                          <span>{attempt.unattempted || 0} Unattempted</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex lg:flex-col gap-2">
                      <Button asChild className="flex-1 lg:w-full">
                        <Link href={`/results/${attempt.id}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Link>
                      </Button>
                      <Button variant="outline" size="icon" disabled>
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" disabled>
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}