// src/app/(student)/leaderboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Trophy, Medal, Award, TrendingUp, TrendingDown, 
  Users, Target, Clock, RefreshCw, Crown, Zap,
  ChevronUp, ChevronDown, Minus
} from 'lucide-react';

interface LeaderboardUser {
  rank: number;
  userId: string;
  userName: string;
  userImage: string | null;
  score: number;
  percentage: number;
  timeTaken: number;
  examsAttempted: number;
  isCurrentUser: boolean;
  rankChange?: number; // For showing if rank improved/dropped
}

interface UserStats {
  rank: number | null;
  totalPoints: number;
  avgAccuracy: number;
  totalParticipants: number;
  examsCompleted: number;
}

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('global');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch subjects
      if (subjects.length === 0) {
        const subjectsRes = await fetch('/api/subjects');
        const subjectsData = await subjectsRes.json();
        setSubjects(subjectsData.subjects || []);
      }

      // Fetch leaderboard data
      let url = '/api/leaderboard/global?limit=50';
      if (activeTab !== 'global') {
        url = `/api/leaderboard/subject/${activeTab}?limit=50`;
      }

      const leaderboardRes = await fetch(url);
      const leaderboardJson = await leaderboardRes.json();

      setLeaderboardData(leaderboardJson.entries || []);

      // Fetch user stats from dashboard API
      const statsRes = await fetch('/api/student/dashboard');
      const statsData = await statsRes.json();

      // Get user's best rank
      const userRank = leaderboardJson.entries.find(
        (entry: LeaderboardUser) => entry.isCurrentUser
      )?.rank || leaderboardJson.currentUserEntry?.rank || null;

      setUserStats({
        rank: userRank,
        totalPoints: Math.round(statsData.stats.averageScore.current * statsData.stats.examsTaken.total),
        avgAccuracy: statsData.stats.averageScore.current,
        totalParticipants: leaderboardJson.totalParticipants,
        examsCompleted: statsData.stats.examsTaken.total
      });

    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-orange-600" />;
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950';
    if (rank === 2) return 'border-gray-400 bg-gray-50 dark:bg-gray-900';
    if (rank === 3) return 'border-orange-600 bg-orange-50 dark:bg-orange-950';
    return '';
  };

  const getRankChangeIcon = (change?: number) => {
    if (!change) return <Minus className="w-4 h-4 text-gray-400" />;
    if (change > 0) return <ChevronUp className="w-4 h-4 text-green-500" />;
    return <ChevronDown className="w-4 h-4 text-red-500" />;
  };

  const topThree = leaderboardData.slice(0, 3);
  const others = leaderboardData.slice(3);
  
  // If less than 4 users, show empty state differently
  const showEmptyState = leaderboardData.length === 0;
  const showAllInTopThree = leaderboardData.length <= 3;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="w-8 h-8 text-yellow-500" />
            Leaderboard
          </h1>
          <p className="text-muted-foreground mt-2">
            See how you rank against other students nationwide
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your Rank</p>
                <p className="text-3xl font-bold">
                  {userStats?.rank ? `#${userStats.rank}` : 'N/A'}
                </p>
                {userStats?.totalParticipants && (
                  <p className="text-xs text-muted-foreground mt-1">
                    of {userStats.totalParticipants}
                  </p>
                )}
              </div>
              <TrendingUp className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Points</p>
                <p className="text-3xl font-bold">
                  {userStats?.totalPoints || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all exams
                </p>
              </div>
              <Zap className="w-10 h-10 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Accuracy</p>
                <p className="text-3xl font-bold">
                  {userStats?.avgAccuracy.toFixed(1) || 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Overall performance
                </p>
              </div>
              <Target className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Exams Done</p>
                <p className="text-3xl font-bold">
                  {userStats?.examsCompleted || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Completed tests
                </p>
              </div>
              <Trophy className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full" style={{ 
          gridTemplateColumns: `repeat(${Math.min(subjects.length + 1, 5)}, 1fr)` 
        }}>
          <TabsTrigger value="global" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Time
          </TabsTrigger>
          {subjects.slice(0, 4).map(subject => (
            <TabsTrigger key={subject.id} value={subject.id}>
              {subject.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Top 3 Podium */}
        {topThree.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {topThree.map((user) => (
                  <Card 
                    key={user.userId} 
                    className={`border-2 ${getRankColor(user.rank)} hover:shadow-xl transition-all`}
                  >
                    <CardContent className="p-6 text-center space-y-4">
                      <div className="flex justify-center">
                        {getRankIcon(user.rank)}
                      </div>

                      <Avatar className="w-20 h-20 mx-auto border-4 border-background">
                        <AvatarImage src={user.userImage || ''} alt={user.userName} />
                        <AvatarFallback className="text-xl">
                          {user.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <h3 className="font-bold text-lg">{user.userName}</h3>
                        {user.isCurrentUser && (
                          <Badge variant="secondary" className="mt-1">You</Badge>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {user.examsAttempted} exams completed
                        </p>
                      </div>

                      <div className="space-y-2 pt-4 border-t">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Score:</span>
                          <span className="font-semibold">{user.score.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Accuracy:</span>
                          <span className="font-semibold">{user.percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {/* Full Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Full Rankings</span>
              <Badge variant="outline">{leaderboardData.length} students</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showEmptyState ? (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No rankings yet</h3>
                <p className="text-muted-foreground">
                  Be the first to complete an exam and claim your spot!
                </p>
              </div>
            ) : showAllInTopThree ? (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  All participants shown above
                </h3>
                <p className="text-muted-foreground">
                  More students will appear here as they complete exams!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {others.map((user, index) => (
                  <div
                    key={user.userId}
                    className={`flex items-center gap-4 p-4 rounded-lg hover:bg-muted transition-all cursor-pointer ${
                      user.isCurrentUser 
                        ? 'bg-primary/10 border-2 border-primary' 
                        : 'border hover:border-primary/50'
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-12 text-center">
                      {getRankIcon(user.rank)}
                    </div>

                    {/* Avatar & Name */}
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.userImage || ''} alt={user.userName} />
                      <AvatarFallback>
                        {user.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold truncate">{user.userName}</h4>
                        {user.isCurrentUser && (
                          <Badge variant="secondary">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {user.examsAttempted} exams • {user.percentage.toFixed(1)}% accuracy
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Score</p>
                        <p className="font-semibold">{user.score.toFixed(1)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Exams</p>
                        <p className="font-semibold">{user.examsAttempted}</p>
                      </div>
                    </div>

                    {/* Rank Change Indicator */}
                    <div className="flex items-center gap-1">
                      {getRankChangeIcon(user.rankChange)}
                      {user.rankChange && Math.abs(user.rankChange) > 0 && (
                        <span className={`text-xs font-medium ${
                          user.rankChange > 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {Math.abs(user.rankChange)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}