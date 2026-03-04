// src/app/(student)/exams/page.tsx
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  FileQuestion,
  Search,
  BookOpen,
  Users,
  LayoutGrid,
  List,
} from 'lucide-react';
import { toast } from 'sonner';

interface Exam {
  id: string;
  title: string;
  slug: string;
  subject: string;
  subjectSlug: string;
  thumbnail: string;
  duration: number;
  totalQuestions: number;
  totalMarks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  price: number;
  isFree: boolean;
  isPurchased: boolean;
  topics: string[];
  totalAttempts: number;
}

// ── helpers ────────────────────────────────────────────────────────────────

const SUBJECT_GRADIENTS = [
  'from-violet-500 to-purple-700',
  'from-blue-500 to-cyan-700',
  'from-emerald-500 to-teal-700',
  'from-orange-500 to-amber-700',
  'from-pink-500 to-rose-700',
  'from-indigo-500 to-blue-700',
  'from-teal-500 to-green-700',
  'from-red-500 to-orange-700',
];

function getSubjectGradient(subject: string) {
  let hash = 0;
  for (let i = 0; i < subject.length; i++)
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  return SUBJECT_GRADIENTS[Math.abs(hash) % SUBJECT_GRADIENTS.length];
}

function getSubjectInitial(subject: string) {
  return subject?.trim()?.[0]?.toUpperCase() || '?';
}

function getDifficultyColor(d: string) {
  switch (d) {
    case 'easy':   return 'bg-green-100 text-green-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    case 'hard':   return 'bg-red-100 text-red-700';
    default:       return 'bg-gray-100 text-gray-700';
  }
}

// ── Card Header (gradient + avatar) ────────────────────────────────────────

function ExamCardHeader({ exam }: { exam: Exam }) {
  const gradient = getSubjectGradient(exam.subject);
  const initial  = getSubjectInitial(exam.subject);

  return (
    <div className={`relative h-36 bg-gradient-to-br ${gradient} rounded-t-lg overflow-hidden`}>
      {/* subtle dot pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />

      {/* subject avatar */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
          <span className="text-2xl font-bold text-white">{initial}</span>
        </div>
        <span className="text-white/80 text-xs font-medium tracking-wide uppercase">
          {exam.subject}
        </span>
      </div>

      {/* difficulty badge */}
      <div className="absolute top-3 left-3">
        <Badge className={getDifficultyColor(exam.difficulty)}>
          {exam.difficulty}
        </Badge>
      </div>

      {/* free / price badge */}
      <div className="absolute top-3 right-3">
        {exam.isFree ? (
          <Badge className="bg-green-100 text-green-800">Free</Badge>
        ) : (
          <Badge className="bg-white/20 text-white border border-white/30">
            ₹{(exam.price / 100).toFixed(0)}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ── Grid Card ──────────────────────────────────────────────────────────────

function ExamGridCard({ exam }: { exam: Exam }) {
  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden">
      <CardContent className="p-0">
        <ExamCardHeader exam={exam} />

        <div className="p-4">
          <h3
            className="font-semibold text-gray-900 truncate mb-1"
            title={exam.title}
          >
            {exam.title}
          </h3>
          <p className="text-sm text-gray-500 mb-3">{exam.subject}</p>

          {/* meta row */}
          <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{exam.duration}min</span>
            </div>
            <div className="flex items-center gap-1">
              <FileQuestion className="h-3.5 w-3.5" />
              <span>{exam.totalQuestions} Q</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{exam.totalAttempts}</span>
            </div>
          </div>

          {/* price row */}
          <div className="mb-4">
            {exam.isFree ? (
              <span className="text-base font-bold text-green-600">Free</span>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-gray-900">
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

          {/* actions */}
          <div className="flex gap-2">
            <Button className="flex-1" size="sm" asChild>
              <Link href={`/exams/${exam.slug}`}>
                {exam.isFree || exam.isPurchased ? 'Start Exam' : 'Purchase'}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/exams/${exam.slug}`}>Details</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── List Row ───────────────────────────────────────────────────────────────

function ExamListRow({ exam }: { exam: Exam }) {
  const gradient = getSubjectGradient(exam.subject);
  const initial  = getSubjectInitial(exam.subject);

  return (
    <div className="flex items-center gap-4 p-4 border-b last:border-0 hover:bg-gray-50 transition-colors">
      {/* mini avatar */}
      <div
        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}
      >
        <span className="text-white font-bold text-sm">{initial}</span>
      </div>

      {/* title + subject */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{exam.title}</p>
        <p className="text-sm text-gray-500">{exam.subject}</p>
      </div>

      {/* difficulty */}
      <Badge className={getDifficultyColor(exam.difficulty)}>
        {exam.difficulty}
      </Badge>

      {/* meta */}
      <div className="hidden md:flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{exam.duration}min</span>
        </div>
        <div className="flex items-center gap-1">
          <FileQuestion className="h-4 w-4" />
          <span>{exam.totalQuestions} Q</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span>{exam.totalAttempts}</span>
        </div>
      </div>

      {/* price */}
      <div className="w-20 text-right">
        {exam.isFree ? (
          <span className="text-green-600 font-semibold">Free</span>
        ) : (
          <span className="font-semibold text-gray-900">
            ₹{(exam.price / 100).toFixed(0)}
          </span>
        )}
      </div>

      {/* actions */}
      <div className="flex gap-2 flex-shrink-0">
        <Button size="sm" asChild>
          <Link href={`/exams/${exam.slug}`}>
            {exam.isFree || exam.isPurchased ? 'Start Exam' : 'Purchase'}
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/exams/${exam.slug}`}>Details</Link>
        </Button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ExamsPage() {
  const [isLoading, setIsLoading]         = useState(true);
  const [exams, setExams]                 = useState<Exam[]>([]);
  const [searchQuery, setSearchQuery]     = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [diffFilter, setDiffFilter]       = useState('all');
  const [priceFilter, setPriceFilter]     = useState('all'); // 'all' | 'free' | 'paid'
  const [viewMode, setViewMode]           = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('studentExamViewMode') as 'grid' | 'list') || 'grid';
    }
    return 'grid';
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => { fetchExams(); }, [searchQuery, diffFilter]);

  useEffect(() => {
    localStorage.setItem('studentExamViewMode', viewMode);
  }, [viewMode]);

  const fetchExams = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (searchQuery)      params.append('search', searchQuery);
      if (diffFilter !== 'all') params.append('difficulty', diffFilter);

      const res = await fetch(`/api/exams?${params}`);
      if (!res.ok) throw new Error('Failed to fetch exams');
      const data = await res.json();

      setExams(data.exams);
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }));
    } catch (error: any) {
      console.error('Failed to fetch exams:', error);
      toast.error('Failed to load exams');
    } finally {
      setIsLoading(false);
    }
  };

  // client-side subject + price filtering (API doesn't support them yet)
  const subjects = Array.from(
    new Map(exams.map(e => [e.subjectSlug, e.subject])).entries()
  ).map(([slug, name]) => ({ slug, name }));

  const filteredExams = exams.filter(e => {
    const matchSubject = subjectFilter === 'all' || e.subjectSlug === subjectFilter;
    const matchPrice =
      priceFilter === 'all' ||
      (priceFilter === 'free' && e.isFree) ||
      (priceFilter === 'paid' && !e.isFree);
    return matchSubject && matchPrice;
  });

  const hasActiveFilters =
    searchQuery || subjectFilter !== 'all' || diffFilter !== 'all' || priceFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSubjectFilter('all');
    setDiffFilter('all');
    setPriceFilter('all');
    toast.info('Filters cleared');
  };

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Browse Exams</h1>
        <p className="mt-2 text-gray-600">
          Choose from {pagination.total} available exams across multiple subjects
        </p>
      </div>

      {/* Filters bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search exams by title..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Subject */}
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(s => (
                  <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Difficulty */}
            <Select value={diffFilter} onValueChange={setDiffFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>

            {/* Free / Paid */}
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Exams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                <SelectItem value="free">Free Only</SelectItem>
                <SelectItem value="paid">Paid Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Grid / List toggle */}
            <div className="flex gap-1 border rounded-md p-1 h-10 self-start flex-shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Active filter summary */}
          {hasActiveFilters && (
            <div className="mt-4 flex items-center gap-2 animate-slide-in-right">
              <span className="text-sm text-gray-600">
                Showing {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''}
              </span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ExamCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filteredExams.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={BookOpen}
              title="No exams found"
              description="Try adjusting your search or filters to find what you're looking for"
              action={{ label: 'Clear Filters', onClick: clearFilters }}
            />
          </CardContent>
        </Card>
      )}

      {/* Grid view */}
      {!isLoading && filteredExams.length > 0 && viewMode === 'grid' && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam, index) => (
            <div
              key={exam.id}
              className="animate-scale-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <ExamGridCard exam={exam} />
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {!isLoading && filteredExams.length > 0 && viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            {filteredExams.map(exam => (
              <ExamListRow key={exam.id} exam={exam} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Count footer */}
      {!isLoading && filteredExams.length > 0 && (
        <div className="text-center text-sm text-gray-600">
          Showing {filteredExams.length} of {pagination.total} exams
        </div>
      )}
    </div>
  );
}