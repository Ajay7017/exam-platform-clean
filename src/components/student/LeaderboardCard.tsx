// src/components/student/LeaderboardCard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, TrendingUp, Clock } from 'lucide-react';
import { LeaderboardEntry } from '@/types/exam';
import { formatDistanceToNow } from 'date-fns';

interface LeaderboardCardProps {
  type: 'exam' | 'global' | 'subject';
  examId?: string;
  subjectId?: string;
  limit?: number;
  showTitle?: boolean;
}

export function LeaderboardCard({ 
  type, 
  examId, 
  subjectId, 
  limit = 25,
  showTitle = true 
}: LeaderboardCardProps) {
  const [data, setData] = useState<{
    entries: LeaderboardEntry[];
    currentUserEntry?: LeaderboardEntry;
    totalParticipants: number;
    examTitle?: string;
    subjectName?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [type, examId, subjectId]);

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      let url = '';
      
      if (type === 'exam' && examId) {
        url = `/api/leaderboard/exam/${examId}?limit=${limit}`;
      } else if (type === 'subject' && subjectId) {
        url = `/api/leaderboard/subject/${subjectId}?limit=${limit}`;
      } else if (type === 'global') {
        url = `/api/leaderboard/global?limit=${limit}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-orange-500" />;
    return null;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    if (rank === 2) return 'bg-gray-100 text-gray-700 border-gray-300';
    if (rank === 3) return 'bg-orange-100 text-orange-700 border-orange-300';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (isLoading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Leaderboard
            </CardTitle>
          </CardHeader>
        )}
        {/* Fix: Add pt-6 if title is hidden */}
        <CardContent className={!showTitle ? 'pt-6' : ''}>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
                <div className="h-10 w-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                  <div className="h-3 w-1/2 bg-gray-200 rounded" />
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Leaderboard
            </CardTitle>
          </CardHeader>
        )}
        {/* Fix: Add pt-6 if title is hidden */}
        <CardContent className={!showTitle ? 'pt-6' : ''}>
          <div className="text-center py-8 text-gray-500">
            <Trophy className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.entries.length === 0) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Leaderboard
            </CardTitle>
          </CardHeader>
        )}
        {/* Fix: Add pt-6 if title is hidden */}
        <CardContent className={!showTitle ? 'pt-6' : ''}>
          <div className="text-center py-8 text-gray-500">
            <Trophy className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No participants yet</p>
            <p className="text-sm mt-1">Be the first to attempt!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              {type === 'global' ? 'Global Leaderboard' : 
               type === 'subject' ? `${data.subjectName} Leaderboard` : 
               'Exam Leaderboard'}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {data.totalParticipants} participants
            </Badge>
          </div>
          {type !== 'global' && data.examTitle && (
            <p className="text-sm text-muted-foreground mt-1">
              {data.examTitle}
            </p>
          )}
        </CardHeader>
      )}
      
      {/* MAJOR FIX HERE: added conditional padding pt-6 when title is hidden */}
      <CardContent className={`space-y-2 ${!showTitle ? 'pt-6' : ''}`}>
        {/* Top Entries */}
        {data.entries.map((entry, index) => (
          <div
            key={entry.userId}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all hover:shadow-md ${
              entry.isCurrentUser 
                ? 'bg-primary-50 border-2 border-primary-200' 
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            {/* Rank */}
            <div className="flex items-center justify-center w-10">
              {getRankIcon(entry.rank) || (
                <span className="text-lg font-bold text-gray-600">
                  {entry.rank}
                </span>
              )}
            </div>

            {/* User Info */}
            <Avatar className="h-10 w-10">
              <AvatarImage src={entry.userImage || ''} alt={entry.userName} />
              <AvatarFallback className="bg-gradient-to-br from-primary-400 to-primary-600 text-white">
                {entry.userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate flex items-center gap-2">
                {entry.userName}
                {entry.isCurrentUser && (
                  <Badge variant="secondary" className="text-xs">You</Badge>
                )}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {type === 'exam' && entry.timeTaken > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(entry.timeTaken)}
                  </span>
                )}
                {type !== 'exam' && (entry as any).examsAttempted && (
                  <span>
                    {(entry as any).examsAttempted} exams
                  </span>
                )}
              </div>
            </div>

            {/* Score */}
            <div className="text-right">
              <Badge className={getRankBadge(entry.rank)}>
                {entry.score.toFixed(1)}
              </Badge>
              <p className="text-xs text-gray-500 mt-1">
                {entry.percentage.toFixed(1)}%
              </p>
            </div>
          </div>
        ))}

        {/* Separator if user is not in top entries */}
        {data.currentUserEntry && (
          <>
            <div className="flex items-center gap-2 py-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">Your Position</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Current User Entry */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary-50 border-2 border-primary-200">
              <div className="flex items-center justify-center w-10">
                <span className="text-lg font-bold text-primary-600">
                  {data.currentUserEntry.rank}
                </span>
              </div>

              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={data.currentUserEntry.userImage || ''} 
                  alt={data.currentUserEntry.userName} 
                />
                <AvatarFallback className="bg-gradient-to-br from-primary-400 to-primary-600 text-white">
                  {data.currentUserEntry.userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate flex items-center gap-2">
                  {data.currentUserEntry.userName}
                  <Badge variant="secondary" className="text-xs">You</Badge>
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {type === 'exam' && data.currentUserEntry.timeTaken > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(data.currentUserEntry.timeTaken)}
                    </span>
                  )}
                  {type !== 'exam' && (data.currentUserEntry as any).examsAttempted && (
                    <span>
                      {(data.currentUserEntry as any).examsAttempted} exams
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <Badge className="bg-primary-100 text-primary-700 border-primary-300">
                  {data.currentUserEntry.score.toFixed(1)}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">
                  {data.currentUserEntry.percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}