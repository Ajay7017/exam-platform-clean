//src/app/(student)/history/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Clock, Play, Eye, AlertCircle,
  Calendar, Timer, CheckCircle2, XCircle, Pause
} from 'lucide-react'

export default async function PracticeHistoryPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  // Fetch ALL user attempts (completed, in-progress, expired)
  const allAttempts = await prisma.attempt.findMany({
    where: {
      userId: session.user.id
    },
    include: {
      exam: {
        select: {
          title: true,
          slug: true,
          totalMarks: true,
          durationMin: true,
          subject: {
            select: {
              name: true
            }
          }
        }
      }
    },
    orderBy: {
      startedAt: 'desc'
    }
  })

  // Calculate statistics
  const completedCount = allAttempts.filter(a => a.status === 'completed').length
  const inProgressCount = allAttempts.filter(a => a.status === 'in_progress' && new Date(a.expiresAt) > new Date()).length
  const expiredCount = allAttempts.filter(a => a.status === 'expired' || (a.status === 'in_progress' && new Date(a.expiresAt) <= new Date())).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Practice History</h1>
        <p className="text-muted-foreground mt-2">
          Track all your exam attempts and activity
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedCount}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{inProgressCount}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Pause className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold">{expiredCount}</p>
              </div>
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <XCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attempts Timeline */}
      {allAttempts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No practice history yet</h3>
            <p className="text-muted-foreground mb-6">
              Start taking exams to build your practice history
            </p>
            <Button asChild>
              <Link href="/exams">Browse Exams</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {allAttempts.map((attempt) => {
            const startedDate = new Date(attempt.startedAt)
            const isExpired = attempt.status === 'expired' || 
              (attempt.status === 'in_progress' && new Date(attempt.expiresAt) <= new Date())
            const isCompleted = attempt.status === 'completed'
            const isInProgress = attempt.status === 'in_progress' && !isExpired

            // Calculate progress for in-progress exams
            const answers = (attempt.answers as Record<string, any>) || {}
            const answeredCount = Object.keys(answers).filter(
              key => answers[key]?.selectedOption
            ).length
            const progressPercentage = attempt.totalQuestions > 0
              ? Math.round((answeredCount / attempt.totalQuestions) * 100)
              : 0

            // Get status badge
            let statusBadge
            if (isCompleted) {
              const percentage = attempt.percentage || 0
              statusBadge = (
                <Badge variant={percentage >= 80 ? 'default' : percentage >= 60 ? 'secondary' : 'destructive'}>
                  Completed • {percentage.toFixed(1)}%
                </Badge>
              )
            } else if (isInProgress) {
              statusBadge = (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  In Progress • {progressPercentage}%
                </Badge>
              )
            } else {
              statusBadge = (
                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                  Expired
                </Badge>
              )
            }

            return (
              <Card key={attempt.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Left: Exam Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold">{attempt.exam.title}</h3>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {startedDate.toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {startedDate.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            {attempt.exam.subject && (
                              <Badge variant="outline" className="text-xs">
                                {attempt.exam.subject.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {statusBadge}
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Questions</p>
                          <p className="font-semibold">{attempt.totalQuestions}</p>
                        </div>
                        {isCompleted ? (
                          <>
                            <div>
                              <p className="text-xs text-muted-foreground">Score</p>
                              <p className="font-semibold">
                                {attempt.score?.toFixed(0) || 0}/{attempt.exam.totalMarks}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Rank</p>
                              <p className="font-semibold">
                                {attempt.rank ? `#${attempt.rank}` : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Time</p>
                              <p className="font-semibold">
                                {Math.floor((attempt.timeSpentSec || 0) / 60)}m
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <p className="text-xs text-muted-foreground">Answered</p>
                              <p className="font-semibold">
                                {answeredCount}/{attempt.totalQuestions}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Duration</p>
                              <p className="font-semibold">{attempt.exam.durationMin}m</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Status</p>
                              <p className="font-semibold">
                                {isInProgress ? 'Active' : 'Ended'}
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Answer breakdown for completed exams */}
                      {isCompleted && (
                        <div className="flex items-center gap-6 text-sm pt-2">
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
                            <span>{attempt.unattempted || 0} Skipped</span>
                          </div>
                        </div>
                      )}

                      {/* Progress bar for in-progress */}
                      {isInProgress && (
                        <div className="pt-2">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{progressPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex lg:flex-col gap-2">
                      {isCompleted && (
                        <Button asChild className="flex-1 lg:w-full">
                          <Link href={`/results/${attempt.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Result
                          </Link>
                        </Button>
                      )}
                      {isInProgress && (
                        <Button asChild className="flex-1 lg:w-full">
                          <Link href={`/exam/take/${attempt.id}`}>
                            <Play className="w-4 h-4 mr-2" />
                            Resume Exam
                          </Link>
                        </Button>
                      )}
                      {isExpired && (
                        <Button disabled className="flex-1 lg:w-full" variant="outline">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Expired
                        </Button>
                      )}
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