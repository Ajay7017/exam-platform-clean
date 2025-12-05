//src/app/(student)/dashboard/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCardSkeleton } from '@/components/student/StatsCardSkeleton';
import { SubjectLeaderboardTabs } from '@/components/student/SubjectLeaderboardTabs';
import { BookOpen, Trophy, Award, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DashboardData {
  stats: {
    examsTaken: {
      total: number;
      thisWeek: number;
    };
    averageScore: {
      current: number;
      change: string;
    };
    rank: {
      current: number | null;
      totalParticipants: number;
    };
    timeSpent: {
      totalHours: number;
      thisWeekHours: number;
    };
  };
  continueExams: Array<{
    attemptId: string;
    examId: string;
    examTitle: string;
    examSlug: string;
    totalQuestions: number;
    answeredCount: number;
    progressPercentage: number;
    startedAt: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    examTitle: string;
    examSlug: string;
    score: string;
    submittedAt: string | null;
  }>;
}

export default function StudentDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/student/dashboard');
      
      if (!response.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Recently';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="text-red-600">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = data ? [
    {
      title: 'Exams Taken',
      value: data.stats.examsTaken.total.toString(),
      icon: BookOpen,
      change: `+${data.stats.examsTaken.thisWeek} this week`,
      changeType: 'positive' as const,
    },
    {
      title: 'Average Score',
      value: `${data.stats.averageScore.current}%`,
      icon: Trophy,
      change: `${parseFloat(data.stats.averageScore.change) >= 0 ? '+' : ''}${data.stats.averageScore.change}% vs last week`,
      changeType: parseFloat(data.stats.averageScore.change) >= 0 ? 'positive' as const : 'negative' as const,
    },
    {
      title: 'Current Rank',
      value: data.stats.rank.current ? `#${data.stats.rank.current}` : 'N/A',
      icon: Award,
      change: `Out of ${data.stats.rank.totalParticipants} students`,
      changeType: 'neutral' as const,
    },
    {
      title: 'Time Spent',
      value: `${data.stats.timeSpent.totalHours}h`,
      icon: Clock,
      change: `${data.stats.timeSpent.thisWeekHours}h this week`,
      changeType: 'neutral' as const,
    },
  ] : [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {session?.user?.name || 'Student'}! 👋
        </h1>
        <p className="mt-2 text-gray-600">
          Here's your learning progress overview
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))
        ) : (
          stats.map((stat, index) => (
            <Card
              key={stat.title}
              className="animate-scale-in card-hover"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs flex items-center gap-1 mt-1 ${
                  stat.changeType === 'positive' 
                    ? 'text-success-600' 
                    : stat.changeType === 'negative'
                    ? 'text-red-600'
                    : 'text-muted-foreground'
                }`}>
                  {stat.changeType === 'positive' && (
                    <TrendingUp className="h-3 w-3" />
                  )}
                  {stat.changeType === 'negative' && (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Leaderboard Section */}
      <Card className="animate-slide-in-right" style={{ animationDelay: '0.3s' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Leaderboard Rankings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            See where you stand among other students
          </p>
        </CardHeader>
        <CardContent>
          <SubjectLeaderboardTabs />
        </CardContent>
      </Card>

      {/* Continue Learning Section */}
      {data && data.continueExams.length > 0 && (
        <Card className="animate-slide-in-right" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <CardTitle>Continue Learning</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 animate-pulse">
                    <div className="h-12 w-12 rounded-lg bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-gray-200 rounded" />
                      <div className="h-3 w-1/2 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {data.continueExams.map((exam, idx) => (
                  <div 
                    key={exam.attemptId}
                    className="flex items-center justify-between p-4 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors cursor-pointer"
                    onClick={() => router.push(`/exam/take/${exam.attemptId}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-500 text-white">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {exam.examTitle}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {exam.answeredCount} of {exam.totalQuestions} questions completed
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-primary-600">
                        {exam.progressPercentage}% Complete
                      </div>
                      <div className="w-32 h-2 bg-gray-200 rounded-full mt-1">
                        <div 
                          className="h-2 bg-primary-500 rounded-full transition-all" 
                          style={{ width: `${exam.progressPercentage}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {data && data.recentActivity.length > 0 && (
        <Card className="animate-slide-in-right" style={{ animationDelay: '0.5s' }}>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-4 animate-pulse">
                    <div className="h-10 w-10 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-gray-200 rounded" />
                      <div className="h-3 w-1/2 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {data.recentActivity.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-center gap-4 hover:bg-gray-50 p-2 rounded-lg transition-colors cursor-pointer"
                    onClick={() => router.push(`/results/${activity.id}`)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-100">
                      <Trophy className="h-5 w-5 text-success-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.action} {activity.examTitle}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getTimeAgo(activity.submittedAt)}
                      </p>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {activity.score}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}