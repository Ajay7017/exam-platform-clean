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
  Tag,
  Package,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

// ── types ───────────────────────────────────────────────────────────────────

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
  tags: string[];
}

interface Bundle {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  price: number;
  originalPrice: number;
  discount: number;
  totalExams: number;
  isPurchased: boolean;
  examTitles: string[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

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
    case 'easy': return 'bg-green-100 text-green-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    case 'hard': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function getOptimizedThumbnail(url: string | null | undefined): string {
  if (!url || !url.includes('cloudinary.com')) return url ?? '';
  return url.replace('/upload/', '/upload/c_fill,w_800,h_450,q_auto,f_auto/');
}

// ── Exam Card Header ─────────────────────────────────────────────────────────

function ExamCardHeader({ exam }: { exam: Exam }) {
  const [imgError, setImgError] = useState(false);
  const gradient = getSubjectGradient(exam.subject);
  const initial = getSubjectInitial(exam.subject);

  // Consider it valid if it's not empty, not a "null" string, and hasn't failed to load
  const isValidThumbnail = Boolean(
    exam.thumbnail && 
    exam.thumbnail !== 'null' && 
    exam.thumbnail !== 'undefined' && 
    !imgError
  );

  if (isValidThumbnail) {
    return (
      <div className="relative w-full rounded-t-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <img
          src={getOptimizedThumbnail(exam.thumbnail)}
          alt={exam.title}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)} // Fallback to gradient if image fails to load
        />
        <div className="absolute top-3 left-3">
          <Badge className={getDifficultyColor(exam.difficulty)}>{exam.difficulty}</Badge>
        </div>
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

  return (
    <div className={`relative w-full bg-gradient-to-br ${gradient} rounded-t-lg overflow-hidden`} style={{ aspectRatio: '16/9' }}>
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
          <span className="text-2xl font-bold text-white">{initial}</span>
        </div>
        <span className="text-white/80 text-xs font-medium tracking-wide uppercase">{exam.subject}</span>
      </div>
      <div className="absolute top-3 left-3">
        <Badge className={getDifficultyColor(exam.difficulty)}>{exam.difficulty}</Badge>
      </div>
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

// ── Exam Grid Card ───────────────────────────────────────────────────────────

function ExamGridCard({ exam }: { exam: Exam }) {
  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden">
      <CardContent className="p-0">
        <ExamCardHeader exam={exam} />
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 truncate mb-1" title={exam.title}>
            {exam.title}
          </h3>
          <p className="text-sm text-gray-500 mb-2">{exam.subject}</p>

          {exam.tags && exam.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {exam.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium"
                >
                  <Tag className="h-2.5 w-2.5" />{tag}
                </span>
              ))}
            </div>
          )}

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

          <div className="mb-4">
            {exam.isFree ? (
              <span className="text-base font-bold text-green-600">Free</span>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-gray-900">
                  ₹{(exam.price / 100).toFixed(0)}
                </span>
                {exam.isPurchased && (
                  <Badge variant="secondary" className="text-xs">Purchased</Badge>
                )}
              </div>
            )}
          </div>

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

// ── Exam List Row ────────────────────────────────────────────────────────────

function ExamListRow({ exam }: { exam: Exam }) {
  const gradient = getSubjectGradient(exam.subject);
  const initial = getSubjectInitial(exam.subject);

  return (
    <div className="flex items-center gap-4 p-4 border-b last:border-0 hover:bg-gray-50 transition-colors">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
        <span className="text-white font-bold text-sm">{initial}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{exam.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-sm text-gray-500">{exam.subject}</span>
          {exam.tags && exam.tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium"
            >
              <Tag className="h-2.5 w-2.5" />{tag}
            </span>
          ))}
        </div>
      </div>

      <Badge className={getDifficultyColor(exam.difficulty)}>{exam.difficulty}</Badge>

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

      <div className="w-20 text-right">
        {exam.isFree ? (
          <span className="text-green-600 font-semibold">Free</span>
        ) : (
          <span className="font-semibold text-gray-900">₹{(exam.price / 100).toFixed(0)}</span>
        )}
      </div>

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

// ── Bundle Card ──────────────────────────────────────────────────────────────

// Replace the BundleCard function in src/app/(student)/exams/page.tsx
// Only this function changes — everything else stays identical.

// ── helper: strip markdown to plain text for card previews ────────────────
function stripMarkdown(md: string): string {
  return md
    .replace(/#{1,6}\s+/g, '')          // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')    // bold
    .replace(/\*(.+?)\*/g, '$1')        // italic
    .replace(/`(.+?)`/g, '$1')          // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/^\s*[-*+]\s+/gm, '')      // bullet points
    .replace(/^\s*\d+\.\s+/gm, '')      // numbered lists
    .replace(/---+/g, '')               // horizontal rules
    .replace(/\n{2,}/g, ' ')            // collapse newlines
    .trim()
}

function BundleCard({ bundle }: { bundle: Bundle }) {
  const [imgError, setImgError] = useState(false);

  const isValidThumbnail = Boolean(
    bundle.thumbnail &&
    bundle.thumbnail !== 'null' &&
    bundle.thumbnail !== 'undefined' &&
    !imgError
  );

  // Plain-text preview: first 120 chars of the stripped description
  const descriptionPreview = bundle.description
    ? stripMarkdown(bundle.description).slice(0, 120) + (stripMarkdown(bundle.description).length > 120 ? '…' : '')
    : null

  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden group">
      <CardContent className="p-0">
        {/* Header */}
        <div
          className={`relative w-full rounded-t-lg overflow-hidden ${!isValidThumbnail ? 'bg-gradient-to-br from-indigo-600 to-purple-700' : ''}`}
          style={{ aspectRatio: '16/9' }}
        >
          {isValidThumbnail ? (
            <img
              src={getOptimizedThumbnail(bundle.thumbnail)}
              alt={bundle.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                  <Package className="h-7 w-7 text-white" />
                </div>
                <span className="text-white/80 text-xs font-medium tracking-wide uppercase">Test Bundle</span>
              </div>
            </>
          )}
          {bundle.discount > 0 && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-orange-100 text-orange-700">{bundle.discount}% OFF</Badge>
            </div>
          )}
          <div className="absolute top-3 right-3">
            <Badge className="bg-white/20 text-white border border-white/30">
              {bundle.totalExams} Exams
            </Badge>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 truncate mb-1" title={bundle.name}>
            {bundle.name}
          </h3>

          {/* Clean plain-text preview — no markdown symbols */}
          {descriptionPreview && (
            <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">
              {descriptionPreview}
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-1">
              <Package className="h-3.5 w-3.5" />
              <span>{bundle.totalExams} exams</span>
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Lifetime access</span>
            </div>
          </div>

          {/* Price */}
          <div className="mb-4">
            {bundle.isPurchased ? (
              <Badge className="bg-green-100 text-green-800">Purchased</Badge>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-gray-900">
                  ₹{(bundle.price / 100).toFixed(0)}
                </span>
                {bundle.discount > 0 && (
                  <>
                    <span className="text-sm text-gray-400 line-through">
                      ₹{(bundle.originalPrice / 100).toFixed(0)}
                    </span>
                    <span className="text-xs text-green-600 font-semibold flex items-center gap-0.5">
                      <Sparkles className="h-3 w-3" />
                      Save ₹{((bundle.originalPrice - bundle.price) / 100).toFixed(0)}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* CTA */}
          <Button className="w-full" size="sm" asChild>
            <Link href={`/bundles/${bundle.slug}`} className="flex items-center justify-center gap-1">
              Explore Bundle
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Bundle Skeleton ───────────────────────────────────────────────────────────

function BundleSkeleton() {
  return (
    <Card className="overflow-hidden animate-pulse">
      <div className="h-36 bg-gray-200 rounded-t-lg" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
        <div className="h-8 bg-gray-200 rounded" />
      </div>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type TabType = 'exams' | 'bundles';

export default function ExamsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('exams');

  // ── Exam state (unchanged) ──────────────────────────────────────────────
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [diffFilter, setDiffFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('studentExamViewMode') as 'grid' | 'list') || 'grid';
    }
    return 'grid';
  });
  const [examPagination, setExamPagination] = useState({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });

  // ── Bundle state ────────────────────────────────────────────────────────
  const [isLoadingBundles, setIsLoadingBundles] = useState(false);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [bundleSearch, setBundleSearch] = useState('');
  const [bundlePagination, setBundlePagination] = useState({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });

  // ── effects ─────────────────────────────────────────────────────────────

  useEffect(() => { fetchExams(); }, [searchQuery, diffFilter, tagFilter]);

  useEffect(() => {
    if (activeTab === 'bundles' && bundles.length === 0) fetchBundles();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'bundles') fetchBundles();
  }, [bundleSearch]);

  useEffect(() => {
    localStorage.setItem('studentExamViewMode', viewMode);
  }, [viewMode]);

  // ── fetchers ─────────────────────────────────────────────────────────────

  const fetchExams = async () => {
    try {
      setIsLoadingExams(true);
      const params = new URLSearchParams({
        page: examPagination.page.toString(),
        limit: examPagination.limit.toString(),
      });
      if (searchQuery) params.append('search', searchQuery);
      if (diffFilter !== 'all') params.append('difficulty', diffFilter);
      if (tagFilter !== 'all') params.append('tag', tagFilter);

      const res = await fetch(`/api/exams?${params}`);
      if (!res.ok) throw new Error('Failed to fetch exams');
      const data = await res.json();

      setExams(data.exams);
      if (data.allTags) setAllTags(data.allTags);
      setExamPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }));
    } catch {
      toast.error('Failed to load exams');
    } finally {
      setIsLoadingExams(false);
    }
  };

  const fetchBundles = async () => {
    try {
      setIsLoadingBundles(true);
      const params = new URLSearchParams({
        page: '1',
        limit: '20',
      });
      if (bundleSearch) params.append('search', bundleSearch);

      const res = await fetch(`/api/bundles?${params}`);
      if (!res.ok) throw new Error('Failed to fetch bundles');
      const data = await res.json();

      setBundles(data.bundles);
      setBundlePagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }));
    } catch {
      toast.error('Failed to load bundles');
    } finally {
      setIsLoadingBundles(false);
    }
  };

  // ── client-side exam filters ─────────────────────────────────────────────

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
    searchQuery || subjectFilter !== 'all' || diffFilter !== 'all' ||
    priceFilter !== 'all' || tagFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery(''); setSubjectFilter('all'); setDiffFilter('all');
    setPriceFilter('all'); setTagFilter('all');
    toast.info('Filters cleared');
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Browse Exams</h1>
        <p className="mt-2 text-gray-600">
          Choose from {examPagination.total} available exams and {bundlePagination.total || ''} bundles
        </p>
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {([
          { key: 'exams', label: 'Single Exams', icon: BookOpen },
          { key: 'bundles', label: 'Test Bundles', icon: Package },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {key === 'bundles' && bundlePagination.total > 0 && (
              <span className="ml-1 bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                {bundlePagination.total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══ EXAMS TAB ══════════════════════════════════════════════════════ */}
      {activeTab === 'exams' && (
        <>
          {/* Filters bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search exams by title..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {allTags.length > 0 && (
                  <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {allTags.map(tag => (
                        <SelectItem key={tag} value={tag}>
                          <span className="flex items-center gap-1.5">
                            <Tag className="h-3 w-3 text-blue-500" />{tag}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

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

                <div className="flex gap-1 border rounded-md p-1 h-10 self-start flex-shrink-0">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-2 rounded transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                    title="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-4 flex items-center gap-2 animate-slide-in-right">
                  <span className="text-sm text-gray-600">
                    Showing {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''}
                    {tagFilter !== 'all' && (
                      <span className="ml-1 inline-flex items-center gap-1 text-blue-700 font-medium">
                        in <Tag className="h-3 w-3" />{tagFilter}
                      </span>
                    )}
                  </span>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loading */}
          {isLoadingExams && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <ExamCardSkeleton key={i} />)}
            </div>
          )}

          {/* Empty */}
          {!isLoadingExams && filteredExams.length === 0 && (
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
          {!isLoadingExams && filteredExams.length > 0 && viewMode === 'grid' && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredExams.map((exam, index) => (
                <div key={exam.id} className="animate-scale-in" style={{ animationDelay: `${index * 0.05}s` }}>
                  <ExamGridCard exam={exam} />
                </div>
              ))}
            </div>
          )}

          {/* List view */}
          {!isLoadingExams && filteredExams.length > 0 && viewMode === 'list' && (
            <Card>
              <CardContent className="p-0">
                {filteredExams.map(exam => <ExamListRow key={exam.id} exam={exam} />)}
              </CardContent>
            </Card>
          )}

          {!isLoadingExams && filteredExams.length > 0 && (
            <div className="text-center text-sm text-gray-600">
              Showing {filteredExams.length} of {examPagination.total} exams
            </div>
          )}
        </>
      )}

      {/* ══ BUNDLES TAB ════════════════════════════════════════════════════ */}
      {activeTab === 'bundles' && (
        <>
          {/* Bundle search bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search bundles..."
                  value={bundleSearch}
                  onChange={e => setBundleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Loading */}
          {isLoadingBundles && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <BundleSkeleton key={i} />)}
            </div>
          )}

          {/* Empty */}
          {!isLoadingBundles && bundles.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={Package}
                  title="No bundles available"
                  description="Check back soon — test bundles will appear here when available."
                />
              </CardContent>
            </Card>
          )}

          {/* Bundle grid */}
          {!isLoadingBundles && bundles.length > 0 && (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {bundles.map((bundle, index) => (
                  <div key={bundle.id} className="animate-scale-in" style={{ animationDelay: `${index * 0.05}s` }}>
                    <BundleCard bundle={bundle} />
                  </div>
                ))}
              </div>
              <div className="text-center text-sm text-gray-600">
                Showing {bundles.length} of {bundlePagination.total} bundle{bundlePagination.total !== 1 ? 's' : ''}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}