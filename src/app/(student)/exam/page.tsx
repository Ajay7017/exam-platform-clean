// src/app/(student)/exam/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ExamCardSkeleton } from '@/components/student/ExamCardSkeleton';
import {
  Clock,
  FileQuestion,
  Star,
  Search,
  BookOpen,
  Filter,
} from 'lucide-react';
import examsData from '@/data/exams.json';
import { toast } from 'sonner';

export default function ExamsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [exams, setExams] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  // Simulate loading (remove in production)
  useEffect(() => {
    const timer = setTimeout(() => {
      setExams(examsData.exams);
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Filter exams
  const filteredExams = exams.filter((exam) => {
    const matchesSearch = exam.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesDifficulty =
      selectedDifficulty === 'all' || exam.difficulty === selectedDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  const handleStartExam = (examId: string, isFree: boolean, isPurchased: boolean) => {
    if (!isFree && !isPurchased) {
      toast.error('Please purchase this exam to start');
      return;
    }
    toast.success('Starting exam...');
    // Navigate to exam
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-success-100 text-success-700';
      case 'medium':
        return 'bg-warning-100 text-warning-700';
      case 'hard':
        return 'bg-error-100 text-error-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Browse Exams</h1>
        <p className="mt-2 text-gray-600">
          Choose from our collection of mock tests and practice exams
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search exams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Difficulty Filter */}
            <div className="flex gap-2">
              <Button
                variant={selectedDifficulty === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDifficulty('all')}
              >
                All
              </Button>
              <Button
                variant={selectedDifficulty === 'easy' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDifficulty('easy')}
              >
                Easy
              </Button>
              <Button
                variant={selectedDifficulty === 'medium' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDifficulty('medium')}
              >
                Medium
              </Button>
              <Button
                variant={selectedDifficulty === 'hard' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDifficulty('hard')}
              >
                Hard
              </Button>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || selectedDifficulty !== 'all') && (
            <div className="mt-4 flex items-center gap-2 animate-slide-in-right">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Showing:</span>
              <Badge variant="secondary">
                {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDifficulty('all');
                  toast.info('Filters cleared');
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ExamCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredExams.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={BookOpen}
              title="No exams found"
              description="Try adjusting your search or filters to find what you're looking for"
              action={{
                label: 'Clear Filters',
                onClick: () => {
                  setSearchQuery('');
                  setSelectedDifficulty('all');
                },
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Exams Grid */}
      {!isLoading && filteredExams.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam, index) => (
            <Card
              key={exam.id}
              className="card-hover overflow-hidden animate-scale-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="p-0">
                {/* Exam Thumbnail */}
                <div className="relative h-40 bg-gradient-to-br from-primary-500 to-primary-700">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileQuestion className="h-16 w-16 text-white opacity-50" />
                  </div>
                  <div className="absolute top-3 left-3">
                    <Badge className={getDifficultyColor(exam.difficulty)}>
                      {exam.difficulty}
                    </Badge>
                  </div>
                  {exam.isFree && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-success-500 text-white">Free</Badge>
                    </div>
                  )}
                </div>

                {/* Exam Info */}
                <div className="p-4">
                  <div className="mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {exam.subject}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-gray-900 line-clamp-2 mb-3">
                    {exam.title}
                  </h3>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{exam.duration}min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileQuestion className="h-4 w-4" />
                      <span>{exam.totalQuestions} Q</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-warning-400 text-warning-400" />
                      <span>{exam.rating}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    {exam.isFree ? (
                      <span className="text-lg font-bold text-success-600">
                        Free
                      </span>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-gray-900">
                          ₹{(exam.price / 100).toFixed(0)}
                        </span>
                        {exam.isPurchased && (
                          <Badge variant="secondary" className="text-xs">
                            Purchased
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleStartExam(exam.id, exam.isFree, exam.isPurchased)}
                    >
                      {exam.isFree || exam.isPurchased ? 'Start Exam' : 'Purchase'}
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/exams/${exam.slug}`}>Details</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results Count */}
      {!isLoading && filteredExams.length > 0 && (
        <div className="text-center text-sm text-gray-600">
          Showing {filteredExams.length} of {exams.length} exams
        </div>
      )}
    </div>
  );
}