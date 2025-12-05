// src/app/(student)/results/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaderboardCard } from '@/components/student/LeaderboardCard';
import {
  Download,
  Share2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Circle,
  Clock,
  Trophy,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = {
  correct: '#10b981',
  wrong: '#ef4444',
  unattempted: '#6b7280',
};

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.id as string;

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResult();
  }, [attemptId]);

  const fetchResult = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/attempts/${attemptId}/result`);
      
      if (!response.ok) {
        throw new Error('Failed to load results');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading results...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <p>{error || 'Results not found'}</p>
            </div>
            <Button 
              onClick={() => router.push('/dashboard')} 
              className="mt-4"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pieData = [
    { name: 'Correct', value: result.correctAnswers },
    { name: 'Wrong', value: result.wrongAnswers },
    { name: 'Unattempted', value: result.unattempted },
  ];

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hrs > 0 ? `${hrs}h ${mins}m ${secs}s` : `${mins}m ${secs}s`;
  };

  const isPassed = result.percentage >= (result.passingMarks || 40);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Exam Results</h1>
            <Badge variant={isPassed ? 'default' : 'destructive'} className="text-sm">
              {isPassed ? 'Passed' : 'Failed'}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">{result.examTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
            Dashboard
          </Button>
        </div>
      </div>

      {/* Score Card */}
      <Card className="border-2">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Your Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-primary">
                  {result.score?.toFixed(2) || 0}
                </span>
                <span className="text-2xl text-muted-foreground">
                  / {result.totalMarks}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {result.percentage?.toFixed(2) || 0}%
                </Badge>
                {result.percentage >= 80 && (
                  <Badge className="bg-green-600">Excellent</Badge>
                )}
                {result.percentage >= 60 && result.percentage < 80 && (
                  <Badge className="bg-blue-600">Good</Badge>
                )}
                {result.percentage >= 40 && result.percentage < 60 && (
                  <Badge className="bg-yellow-600">Average</Badge>
                )}
                {result.percentage < 40 && (
                  <Badge className="bg-red-600">Needs Improvement</Badge>
                )}
              </div>
            </div>

            <div className="text-right space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Time: {formatTime(result.timeSpent)}</span>
              </div>
              {result.rank && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Trophy className="w-4 h-4" />
                  <span>Rank: #{result.rank} / {result.totalAttempts}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span>{new Date(result.submittedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Correct Answers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{result.correctAnswers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              Wrong Answers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{result.wrongAnswers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Circle className="w-4 h-4 text-gray-600" />
              Unattempted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-600">{result.unattempted}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - UPDATED to include Leaderboard */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="solutions">Solutions</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Answer Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.name === 'Correct'
                              ? COLORS.correct
                              : entry.name === 'Wrong'
                              ? COLORS.wrong
                              : COLORS.unattempted
                          }
                        />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Topic-wise Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Topic-wise Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.topicWisePerformance?.map((topic: any) => (
                    <div key={topic.topic} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{topic.topic}</span>
                        <span className="text-muted-foreground">
                          {topic.correct}/{topic.total} ({topic.accuracy.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${topic.accuracy}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ✅ NEW: Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-4">
          <LeaderboardCard 
            type="exam" 
            examId={result.examId} 
            limit={25}
            showTitle={true}
          />
        </TabsContent>

        <TabsContent value="solutions" className="space-y-4">
          {result.questionResults?.map((q: any, index: number) => (
            <Card key={q.questionId} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Question {index + 1}</span>
                      {q.isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : q.yourAnswer ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <p className="mt-2">{q.statement}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {q.options?.map((opt: any) => (
                    <div
                      key={opt.key}
                      className={`p-3 rounded-lg border-2 ${
                        opt.isCorrect
                          ? 'border-green-500 bg-green-50'
                          : opt.key === q.yourAnswer && !q.isCorrect
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{opt.key}.</span>
                        <span>{opt.text}</span>
                        {opt.isCorrect && (
                          <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                        )}
                        {opt.key === q.yourAnswer && !q.isCorrect && (
                          <XCircle className="w-4 h-4 text-red-600 ml-auto" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <strong>Your Answer:</strong> {q.yourAnswer || 'Not Attempted'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Correct Answer:</strong> {q.correctAnswer}
                  </p>
                  {q.explanation && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900">Explanation:</p>
                      <p className="text-sm text-blue-800 mt-1">{q.explanation}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}