'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Loader2, Plus, Save, ArrowLeft, Hash, ListChecks,
  Columns2, Trash2, AlertTriangle, X
} from 'lucide-react';
import { RichTextEditor } from '@/components/admin/RichTextEditor';

// ── content checker — untouched ───────────────────────────────────────────────
const hasContent = (html: string): boolean => {
  if (!html) return false;
  const hasImage = /<img\s/i.test(html);
  if (hasImage) return true;
  const textOnly = html.replace(/<[^>]*>/g, '').trim();
  return textOnly.length >= 1;
};

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim();

// ── MatchPairs type — untouched ───────────────────────────────────────────────
interface MatchPairs {
  leftColumn: { header: string; items: string[] };
  rightColumn: { header: string; items: string[] };
}

// ✅ NEW: Duplicate detection result type
interface DuplicateInfo {
  id: string;
  statement: string;
  topicName: string;
  subjectName: string;
}

// ── Zod schema — untouched ────────────────────────────────────────────────────
const questionSchema = z.object({
  statement: z.string().refine(
    (v) => {
      const hasImage = /<img\s/i.test(v);
      if (hasImage) return true;
      return stripHtml(v).length >= 5;
    },
    { message: 'Question statement is required (min 5 characters, or insert an image)' }
  ),
  subjectId: z.string().min(1, 'Subject is required'),
  topicId: z.string().optional(),
  topicName: z.string().optional(),
  subTopicId: z.string().optional(),
  subTopicName: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  marks: z.number().min(0.5),
  negativeMarks: z.number().min(0),
  explanation: z.string().optional(),
  isActive: z.boolean().optional(),

  optionA: z.string().optional(),
  optionB: z.string().optional(),
  optionC: z.string().optional(),
  optionD: z.string().optional(),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']).optional(),

  questionType: z.enum(['mcq', 'numerical', 'match']).default('mcq'),

  numericalAnswerType: z.enum(['exact', 'range']).optional(),
  correctAnswerExact: z.number().optional().nullable(),
  correctAnswerMin: z.number().optional().nullable(),
  correctAnswerMax: z.number().optional().nullable(),

}).refine(
  (data) => data.topicId || data.topicName,
  { message: 'Topic is required', path: ['topicId'] }
).refine(
  (data) => {
    if (data.questionType === 'mcq') {
      return (
        hasContent(data.optionA || '') &&
        hasContent(data.optionB || '') &&
        hasContent(data.optionC || '') &&
        hasContent(data.optionD || '') &&
        !!data.correctAnswer
      );
    }
    return true;
  },
  { message: 'All 4 options and correct answer are required for MCQ (text or image)', path: ['optionA'] }
).refine(
  (data) => {
    if (data.questionType === 'match') {
      return (
        hasContent(data.optionA || '') &&
        hasContent(data.optionB || '') &&
        hasContent(data.optionC || '') &&
        hasContent(data.optionD || '') &&
        !!data.correctAnswer
      );
    }
    return true;
  },
  { message: 'All 4 combination options and correct answer are required for Match', path: ['optionA'] }
).refine(
  (data) => {
    if (data.questionType === 'numerical' && data.numericalAnswerType === 'exact') {
      return data.correctAnswerExact !== null && data.correctAnswerExact !== undefined;
    }
    return true;
  },
  { message: 'Exact answer is required', path: ['correctAnswerExact'] }
).refine(
  (data) => {
    if (data.questionType === 'numerical' && data.numericalAnswerType === 'range') {
      return (
        data.correctAnswerMin !== null && data.correctAnswerMin !== undefined &&
        data.correctAnswerMax !== null && data.correctAnswerMax !== undefined
      );
    }
    return true;
  },
  { message: 'Both min and max values are required for range', path: ['correctAnswerMin'] }
).refine(
  (data) => {
    if (
      data.questionType === 'numerical' &&
      data.numericalAnswerType === 'range' &&
      data.correctAnswerMin !== null && data.correctAnswerMin !== undefined &&
      data.correctAnswerMax !== null && data.correctAnswerMax !== undefined
    ) {
      return data.correctAnswerMin < data.correctAnswerMax;
    }
    return true;
  },
  { message: 'Min value must be less than max value', path: ['correctAnswerMin'] }
);

type QuestionFormData = z.infer<typeof questionSchema>;

interface Subject { id: string; name: string; slug: string; }
interface Topic { id: string; name: string; slug: string; subjectId: string; }
interface SubTopic { id: string; name: string; slug: string; topicId: string; }

interface QuestionFormProps {
  questionId?: string;
  initialData?: Partial<QuestionFormData>;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'standalone' | 'dialog';
}

const defaultMatchPairs = (): MatchPairs => ({
  leftColumn: { header: 'Column I', items: ['', '', '', ''] },
  rightColumn: { header: 'Column II', items: ['', '', '', ''] },
});

export function QuestionForm({
  questionId,
  initialData,
  onSuccess,
  onCancel,
  mode = 'standalone'
}: QuestionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingSubTopics, setLoadingSubTopics] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [topicMode, setTopicMode] = useState<'select' | 'create'>('select');
  const [subTopicMode, setSubTopicMode] = useState<'select' | 'create'>('select');

  const [questionType, setQuestionType] = useState<'mcq' | 'numerical' | 'match'>(
    (initialData?.questionType as 'mcq' | 'numerical' | 'match') || 'mcq'
  );
  const [numericalAnswerType, setNumericalAnswerType] = useState<'exact' | 'range'>(
    (initialData?.numericalAnswerType as 'exact' | 'range') || 'exact'
  );

  const [matchPairs, setMatchPairs] = useState<MatchPairs>(() => {
    const existing = (initialData as any)?.matchPairs;
    if (
      existing &&
      Array.isArray(existing.leftColumn?.items) &&
      Array.isArray(existing.rightColumn?.items)
    ) {
      return existing as MatchPairs;
    }
    return defaultMatchPairs();
  });
  const [matchPairsError, setMatchPairsError] = useState<string>('');

  // ✅ NEW: Duplicate detection state
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateInfo | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const isEditMode = !!questionId;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema) as any,
    defaultValues: initialData || {
      marks: 4,
      negativeMarks: 1,
      difficulty: 'medium',
      correctAnswer: 'A',
      isActive: true,
      statement: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      explanation: '',
      questionType: 'mcq',
      numericalAnswerType: 'exact',
      correctAnswerExact: null,
      correctAnswerMin: null,
      correctAnswerMax: null,
    },
  });

  const watchSubjectId = watch('subjectId');
  const watchTopicId = watch('topicId');

  // ✅ Watch fields needed for duplicate check
  const watchStatement = watch('statement');
  const watchOptionA = watch('optionA');
  const watchOptionB = watch('optionB');
  const watchOptionC = watch('optionC');
  const watchOptionD = watch('optionD');
  const watchCorrectAnswerExact = watch('correctAnswerExact');
  const watchCorrectAnswerMin = watch('correctAnswerMin');
  const watchCorrectAnswerMax = watch('correctAnswerMax');

  useEffect(() => { setValue('questionType', questionType); }, [questionType, setValue]);
  useEffect(() => { setValue('numericalAnswerType', numericalAnswerType); }, [numericalAnswerType, setValue]);

  // ✅ NEW: Debounced duplicate check
  // Fires 800ms after user stops typing any relevant field
  // Skips check in edit mode — editing existing question shouldn't block on itself
  const triggerDuplicateCheck = useCallback(() => {
    if (isEditMode) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      // Build payload matching what the API expects
      // The API computes the hash server-side from these fields
      const payload: Record<string, any> = {
        questionType,
        statement: watchStatement || '',
        optionA: watchOptionA || '',
        optionB: watchOptionB || '',
        optionC: watchOptionC || '',
        optionD: watchOptionD || '',
        correctAnswerExact: watchCorrectAnswerExact ?? null,
        correctAnswerMin: watchCorrectAnswerMin ?? null,
        correctAnswerMax: watchCorrectAnswerMax ?? null,
        matchPairs: questionType === 'match' ? matchPairs : null,
      };

      // Don't check if statement is too short — not meaningful yet
      const statementText = (watchStatement || '').replace(/<[^>]*>/g, '').trim();
      if (statementText.length < 10) {
        setDuplicateWarning(null);
        return;
      }

      // For MCQ/Match: don't check until at least one option has content
      if (questionType === 'mcq' || questionType === 'match') {
        const hasAnyOption = [watchOptionA, watchOptionB, watchOptionC, watchOptionD]
          .some(o => (o || '').replace(/<[^>]*>/g, '').trim().length > 0);
        if (!hasAnyOption) {
          setDuplicateWarning(null);
          return;
        }
      }

      try {
        setIsCheckingDuplicate(true);

        // Call compute-hash endpoint to get hash server-side
        // then check duplicate with that hash
        const hashRes = await fetch('/api/admin/questions/compute-hash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!hashRes.ok) return;
        const { hash } = await hashRes.json();

        // If hash is null (image-only options etc), skip check
        if (!hash) {
          setDuplicateWarning(null);
          return;
        }

        const checkRes = await fetch(
          `/api/admin/questions?checkDuplicate=true&hash=${encodeURIComponent(hash)}`
        );
        if (!checkRes.ok) return;
        const result = await checkRes.json();

        setDuplicateWarning(result.isDuplicate ? result.existing : null);
      } catch {
        // Silently fail — duplicate check is non-blocking
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 800);
  }, [
    isEditMode, questionType, watchStatement,
    watchOptionA, watchOptionB, watchOptionC, watchOptionD,
    watchCorrectAnswerExact, watchCorrectAnswerMin, watchCorrectAnswerMax,
    matchPairs,
  ]);

  // Trigger duplicate check whenever any relevant field changes
  useEffect(() => {
    triggerDuplicateCheck();
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [triggerDuplicateCheck]);

  // ── init — untouched ──────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoadingSubjects(true);
      try {
        const subjectsRes = await fetch('/api/admin/subjects?isActive=true');
        if (!subjectsRes.ok) throw new Error('Failed to fetch subjects');
        const subjectsData = await subjectsRes.json();
        setSubjects(subjectsData || []);

        if (initialData?.subjectId && initialData?.topicId) {
          setSelectedSubjectId(initialData.subjectId);
          setSelectedTopicId(initialData.topicId);
          setValue('subjectId', initialData.subjectId);
          setLoadingTopics(true);
          setLoadingSubTopics(true);

          const [topicsRes, subTopicsRes] = await Promise.all([
            fetch(`/api/admin/topics?subjectId=${initialData.subjectId}&isActive=true`),
            fetch(`/api/admin/subtopics?topicId=${initialData.topicId}&isActive=true`),
          ]);

          const topicsData = topicsRes.ok ? await topicsRes.json() : [];
          const subTopicsData = subTopicsRes.ok ? await subTopicsRes.json() : [];

          setTopics(topicsData || []);
          setSubTopics(subTopicsData || []);

          if (topicsData?.length > 0) {
            setTopicMode('select');
            setValue('topicId', initialData.topicId);
          } else {
            setTopicMode('create');
          }

          if (subTopicsData?.length > 0 && initialData.subTopicId) {
            setSubTopicMode('select');
            setValue('subTopicId', initialData.subTopicId);
          } else {
            setSubTopicMode(subTopicsData?.length > 0 ? 'select' : 'create');
          }

          setLoadingTopics(false);
          setLoadingSubTopics(false);
        }
      } catch (error) {
        toast.error('Failed to load form data');
      } finally {
        setLoadingSubjects(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (watchSubjectId && watchSubjectId !== selectedSubjectId) {
      setSelectedSubjectId(watchSubjectId);
      setValue('topicId', '');
      setValue('topicName', '');
      setSubTopics([]);
      setValue('subTopicId', '');
      setValue('subTopicName', '');
      setSelectedTopicId('');
      fetchTopicsForSubject(watchSubjectId);
    }
  }, [watchSubjectId]);

  useEffect(() => {
    if (watchTopicId && watchTopicId !== selectedTopicId) {
      setSelectedTopicId(watchTopicId);
      setValue('subTopicId', '');
      setValue('subTopicName', '');
      fetchSubTopicsForTopic(watchTopicId);
    } else if (!watchTopicId && selectedTopicId) {
      setSubTopics([]);
      setValue('subTopicId', '');
      setValue('subTopicName', '');
      setSelectedTopicId('');
    }
  }, [watchTopicId]);

  const fetchTopicsForSubject = async (subjectId: string) => {
    if (!subjectId) { setTopics([]); return; }
    setLoadingTopics(true);
    try {
      const res = await fetch(`/api/admin/topics?subjectId=${subjectId}&isActive=true`);
      if (!res.ok) throw new Error('Failed to fetch topics');
      const data = await res.json();
      setTopics(data || []);
      setTopicMode(data?.length > 0 ? 'select' : 'create');
    } catch (error) {
      toast.error('Failed to load topics');
      setTopics([]);
      setTopicMode('create');
    } finally {
      setLoadingTopics(false);
    }
  };

  const fetchSubTopicsForTopic = async (topicId: string) => {
    if (!topicId) { setSubTopics([]); return; }
    setLoadingSubTopics(true);
    try {
      const res = await fetch(`/api/admin/subtopics?topicId=${topicId}&isActive=true`);
      if (!res.ok) throw new Error('Failed to fetch subtopics');
      const data = await res.json();
      setSubTopics(data || []);
      setSubTopicMode(data?.length > 0 ? 'select' : 'create');
    } catch (error) {
      toast.error('Failed to load subtopics');
      setSubTopics([]);
      setSubTopicMode('create');
    } finally {
      setLoadingSubTopics(false);
    }
  };

  useEffect(() => {
    if (questionId && !initialData) {
      const fetchQuestion = async () => {
        try {
          const res = await fetch(`/api/admin/questions/${questionId}`);
          const data = await res.json();
          if (data.question) {
            reset(data.question);
            if (data.question.questionType) setQuestionType(data.question.questionType);
            if (data.question.numericalAnswerType) setNumericalAnswerType(data.question.numericalAnswerType);
            if (data.question.matchPairs) setMatchPairs(data.question.matchPairs);
          }
        } catch (e) {
          toast.error('Failed to load question');
        }
      };
      fetchQuestion();
    }
  }, [questionId, initialData, reset]);

  // ── Match pairs helpers — untouched ───────────────────────────────────────
  const updateMatchItem = (side: 'left' | 'right', index: number, value: string) => {
    setMatchPairs(prev => {
      const col = side === 'left' ? 'leftColumn' : 'rightColumn';
      const newItems = [...prev[col].items];
      newItems[index] = value;
      return { ...prev, [col]: { ...prev[col], items: newItems } };
    });
    setMatchPairsError('');
  };

  const updateMatchHeader = (side: 'left' | 'right', value: string) => {
    setMatchPairs(prev => {
      const col = side === 'left' ? 'leftColumn' : 'rightColumn';
      return { ...prev, [col]: { ...prev[col], header: value } };
    });
  };

  const addMatchRow = () => {
    if (matchPairs.leftColumn.items.length >= 6) {
      toast.error('Maximum 6 rows allowed');
      return;
    }
    setMatchPairs(prev => ({
      leftColumn: { ...prev.leftColumn, items: [...prev.leftColumn.items, ''] },
      rightColumn: { ...prev.rightColumn, items: [...prev.rightColumn.items, ''] },
    }));
  };

  const removeMatchRow = (index: number) => {
    if (matchPairs.leftColumn.items.length <= 2) {
      toast.error('Minimum 2 rows required');
      return;
    }
    setMatchPairs(prev => ({
      leftColumn: { ...prev.leftColumn, items: prev.leftColumn.items.filter((_, i) => i !== index) },
      rightColumn: { ...prev.rightColumn, items: prev.rightColumn.items.filter((_, i) => i !== index) },
    }));
  };

  const validateMatchPairs = (): boolean => {
    const leftEmpty = matchPairs.leftColumn.items.some(i => !hasContent(i));
    const rightEmpty = matchPairs.rightColumn.items.some(i => !hasContent(i));
    if (leftEmpty || rightEmpty) {
      setMatchPairsError('All match items must be filled in');
      return false;
    }
    if (!matchPairs.leftColumn.header.trim() || !matchPairs.rightColumn.header.trim()) {
      setMatchPairsError('Both column headers are required');
      return false;
    }
    setMatchPairsError('');
    return true;
  };

  const LEFT_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const RIGHT_LABELS = ['i', 'ii', 'iii', 'iv', 'v', 'vi'];

  // ── Submit — updated with duplicate gate ─────────────────────────────────
  const onSubmit = async (data: QuestionFormData) => {
    if (questionType === 'match' && !validateMatchPairs()) return;

    // ✅ NEW: Hard block if duplicate warning is active at save time
    // This catches cases where debounce fired and found a duplicate
    if (duplicateWarning && !isEditMode) {
      setShowDuplicateModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        statement: data.statement,
        difficulty: data.difficulty,
        marks: data.marks,
        negativeMarks: data.negativeMarks,
        explanation: data.explanation,
        isActive: data.isActive,
        questionType,
      };

      if (topicMode === 'select' && data.topicId) {
        payload.topicId = data.topicId;
      } else if (topicMode === 'create' && data.topicName) {
        payload.subjectId = data.subjectId;
        payload.topicName = data.topicName;
      } else {
        throw new Error('Please select or create a topic');
      }

      if (subTopicMode === 'select' && data.subTopicId) {
        payload.subTopicId = data.subTopicId;
      } else if (subTopicMode === 'create' && data.subTopicName) {
        payload.subTopicName = data.subTopicName;
      }

      if (questionType === 'mcq') {
        payload.optionA = data.optionA;
        payload.optionB = data.optionB;
        payload.optionC = data.optionC;
        payload.optionD = data.optionD;
        payload.correctAnswer = data.correctAnswer;
      }

      if (questionType === 'match') {
        payload.matchPairs = matchPairs;
        payload.optionA = data.optionA;
        payload.optionB = data.optionB;
        payload.optionC = data.optionC;
        payload.optionD = data.optionD;
        payload.correctAnswer = data.correctAnswer;
      }

      if (questionType === 'numerical') {
        if (numericalAnswerType === 'exact') {
          payload.correctAnswerExact = data.correctAnswerExact;
          payload.correctAnswerMin = null;
          payload.correctAnswerMax = null;
        } else {
          payload.correctAnswerExact = null;
          payload.correctAnswerMin = data.correctAnswerMin;
          payload.correctAnswerMax = data.correctAnswerMax;
        }
      }

      const url = isEditMode ? `/api/admin/questions/${questionId}` : '/api/admin/questions';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      // ✅ NEW: Handle 409 duplicate response from server
      // This is the safety net — catches duplicates even if frontend debounce missed
      if (res.status === 409 && result.isDuplicate) {
        setDuplicateWarning(result.existing);
        setShowDuplicateModal(true);
        return;
      }

      if (!res.ok) throw new Error(result.error || 'Failed to save question');

      toast.success(isEditMode ? 'Question updated successfully' : 'Question saved successfully');

      if (onSuccess) {
        onSuccess();
      } else if (!isEditMode) {
        // Clear duplicate state on successful save
        setDuplicateWarning(null);

        reset({
          subjectId: data.subjectId,
          topicId: data.topicId,
          topicName: data.topicName,
          subTopicId: data.subTopicId,
          subTopicName: data.subTopicName,
          difficulty: data.difficulty,
          marks: data.marks,
          negativeMarks: data.negativeMarks,
          statement: '',
          optionA: '',
          optionB: '',
          optionC: '',
          optionD: '',
          correctAnswer: 'A',
          explanation: '',
          isActive: true,
          questionType,
          numericalAnswerType,
          correctAnswerExact: null,
          correctAnswerMin: null,
          correctAnswerMax: null,
        });
        if (questionType === 'match') setMatchPairs(defaultMatchPairs());
      }

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    else window.history.back();
  };

  const CardWrapper = mode === 'dialog' ? 'div' : Card;
  const cardProps = mode === 'dialog' ? {} : { className: "max-w-4xl mx-auto border-t-4 border-t-primary shadow-lg" };

  return (
    <CardWrapper {...cardProps}>

      {/* ✅ NEW: Duplicate Detected Modal */}
      {showDuplicateModal && duplicateWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 bg-amber-50 border-b border-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-amber-900">Duplicate Question Detected</h3>
              </div>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="text-amber-600 hover:text-amber-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">
                This question already exists in the system and <strong>will not be saved</strong> to avoid duplication.
              </p>

              {/* Existing question info */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-amber-700 font-medium">
                  <span>Already exists in:</span>
                  <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                    {duplicateWarning.subjectName}
                  </span>
                  <span>→</span>
                  <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                    {duplicateWarning.topicName}
                  </span>
                </div>
                <p className="text-sm text-gray-700 italic line-clamp-3">
                  "{duplicateWarning.statement}"
                </p>
              </div>

              <p className="text-xs text-gray-500">
                Please edit the question to make it unique, or go back to the question list.
              </p>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
              <Button
                onClick={() => setShowDuplicateModal(false)}
                variant="outline"
                className="border-amber-300 text-amber-800 hover:bg-amber-50"
              >
                OK, Go Back & Edit
              </Button>
            </div>
          </div>
        </div>
      )}

      {mode === 'standalone' && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                {isEditMode ? 'Edit Question' : 'Add New Question'}
              </CardTitle>
              <CardDescription>
                {isEditMode
                  ? 'Update question details below'
                  : 'Enter question details below. Subject & Topic persist after saving.'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to List
            </Button>
          </div>
        </CardHeader>
      )}

      <CardContent className={mode === 'dialog' ? 'p-0' : ''}>
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">

          {/* Question Type Toggle — untouched */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-sm font-medium text-slate-600">Question Type:</span>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => { setQuestionType('mcq'); setDuplicateWarning(null); }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  questionType === 'mcq' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ListChecks className="w-4 h-4" />
                MCQ
              </button>
              <button
                type="button"
                onClick={() => { setQuestionType('numerical'); setDuplicateWarning(null); }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  questionType === 'numerical' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Hash className="w-4 h-4" />
                Numerical (NAT)
              </button>
              <button
                type="button"
                onClick={() => { setQuestionType('match'); setDuplicateWarning(null); }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  questionType === 'match' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Columns2 className="w-4 h-4" />
                Match
              </button>
            </div>
          </div>

          {/* Subject / Topic / SubTopic Row — untouched */}
          <div className="grid gap-6 md:grid-cols-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="space-y-2">
              <Label>Subject *</Label>
              <select
                {...register('subjectId')}
                disabled={loadingSubjects}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {loadingSubjects ? 'Loading subjects...' : 'Select Subject'}
                </option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
              {errors.subjectId && <p className="text-xs text-red-500">{errors.subjectId.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Topic *</Label>
                {topics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTopicMode(topicMode === 'select' ? 'create' : 'select');
                      setValue('topicId', '');
                      setValue('topicName', '');
                      setSubTopics([]);
                      setValue('subTopicId', '');
                      setValue('subTopicName', '');
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    {topicMode === 'select' ? '+ Create New' : 'Select Existing'}
                  </button>
                )}
              </div>
              {!watchSubjectId ? (
                <Input disabled placeholder="Select a subject first" />
              ) : loadingTopics ? (
                <Input disabled placeholder="Loading topics..." />
              ) : topicMode === 'select' && topics.length > 0 ? (
                <select
                  {...register('topicId')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select Topic</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>{topic.name}</option>
                  ))}
                </select>
              ) : (
                <Input {...register('topicName')} placeholder="e.g. Thermodynamics" />
              )}
              {(errors.topicId || errors.topicName) && (
                <p className="text-xs text-red-500">{errors.topicId?.message || errors.topicName?.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>SubTopic <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                {subTopics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubTopicMode(subTopicMode === 'select' ? 'create' : 'select');
                      setValue('subTopicId', '');
                      setValue('subTopicName', '');
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    {subTopicMode === 'select' ? '+ Create New' : 'Select Existing'}
                  </button>
                )}
              </div>
              {!watchTopicId && topicMode === 'select' ? (
                <Input disabled placeholder="Select a topic first" />
              ) : loadingSubTopics ? (
                <Input disabled placeholder="Loading subtopics..." />
              ) : subTopicMode === 'select' && subTopics.length > 0 ? (
                <select
                  {...register('subTopicId')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select SubTopic</option>
                  {subTopics.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              ) : (
                <Input {...register('subTopicName')} placeholder="e.g. Boyle's Law" />
              )}
            </div>
          </div>

          {/* Question Statement */}
          <div className="space-y-2">
            <Label>Question Statement *</Label>
            <Controller
              name="statement"
              control={control}
              render={({ field }) => (
                <RichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Type your question here... You can paste screenshots directly!"
                  minHeight="120px"
                />
              )}
            />
            {errors.statement && (
              <p className="text-xs text-red-500">{errors.statement.message}</p>
            )}

            {/* ✅ NEW: Inline duplicate warning banner — shown below statement */}
            {!isEditMode && isCheckingDuplicate && (
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking for duplicates...
              </div>
            )}
            {!isEditMode && !isCheckingDuplicate && duplicateWarning && (
              <div className="flex items-start gap-2 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-800">
                    Similar question already exists
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Found in <strong>{duplicateWarning.subjectName}</strong> → <strong>{duplicateWarning.topicName}</strong>
                  </p>
                  <p className="text-xs text-amber-600 mt-1 italic line-clamp-1">
                    "{duplicateWarning.statement}"
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="text-amber-500 hover:text-amber-700 shrink-0"
                  title="Dismiss warning"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* MCQ Options — untouched */}
          {questionType === 'mcq' && (
            <div className="grid gap-4 md:grid-cols-2">
              {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                <div key={opt} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Option {opt}</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value={opt}
                        {...register('correctAnswer')}
                        className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                      />
                      <span className="text-xs text-muted-foreground">Correct</span>
                    </div>
                  </div>
                  <Controller
                    name={`option${opt}` as 'optionA' | 'optionB' | 'optionC' | 'optionD'}
                    control={control}
                    render={({ field }) => (
                      <RichTextEditor
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder={`Option ${opt} — type text or paste/upload an image`}
                        minHeight="60px"
                      />
                    )}
                  />
                </div>
              ))}
              {errors.optionA?.message === 'All 4 options and correct answer are required for MCQ (text or image)' && (
                <p className="text-xs text-red-500 col-span-2">{errors.optionA.message}</p>
              )}
            </div>
          )}

          {/* Match Question Builder — untouched */}
          {questionType === 'match' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-violet-200 bg-violet-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-violet-200 bg-violet-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Columns2 className="w-4 h-4 text-violet-600" />
                    <span className="text-sm font-semibold text-violet-800">Match Column Builder</span>
                  </div>
                  <span className="text-xs text-violet-500">{matchPairs.leftColumn.items.length} rows</span>
                </div>

                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-[32px_1fr_32px_1fr_40px] gap-2 items-center">
                    <div />
                    <Input
                      value={matchPairs.leftColumn.header}
                      onChange={(e) => updateMatchHeader('left', e.target.value)}
                      placeholder="Column I header"
                      className="text-sm font-medium bg-white border-violet-200 focus:border-violet-400"
                    />
                    <div />
                    <Input
                      value={matchPairs.rightColumn.header}
                      onChange={(e) => updateMatchHeader('right', e.target.value)}
                      placeholder="Column II header"
                      className="text-sm font-medium bg-white border-violet-200 focus:border-violet-400"
                    />
                    <div />
                  </div>

                  {matchPairs.leftColumn.items.map((leftItem, index) => (
                    <div key={index} className="rounded-lg border border-violet-100 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-200 text-violet-700 text-xs font-bold shrink-0">
                            {LEFT_LABELS[index]}
                          </div>
                          <span className="text-xs text-violet-600 font-medium">Column I</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMatchRow(index)}
                          className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <RichTextEditor
                        value={leftItem}
                        onChange={(val) => updateMatchItem('left', index, val)}
                        placeholder="e.g. Axile"
                        minHeight="50px"
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold shrink-0">
                          {RIGHT_LABELS[index]}
                        </div>
                        <span className="text-xs text-slate-500 font-medium">Column II</span>
                      </div>
                      <RichTextEditor
                        value={matchPairs.rightColumn.items[index]}
                        onChange={(val) => updateMatchItem('right', index, val)}
                        placeholder="e.g. Sunflower"
                        minHeight="50px"
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addMatchRow}
                    disabled={matchPairs.leftColumn.items.length >= 6}
                    className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Row {matchPairs.leftColumn.items.length >= 6 ? '(max 6)' : ''}
                  </button>

                  {matchPairsError && (
                    <p className="text-xs text-red-500 mt-1">{matchPairsError}</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-amber-200 bg-amber-100">
                  <p className="text-sm font-semibold text-amber-800">Answer Combinations</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Enter the 4 answer combinations students will choose from. Mark the correct one.
                  </p>
                </div>
                <div className="p-4 grid gap-3 md:grid-cols-2">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                    <div key={opt} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-amber-800">Option {opt}</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            value={opt}
                            {...register('correctAnswer')}
                            className="w-4 h-4 text-amber-600 border-gray-300 focus:ring-amber-500"
                          />
                          <span className="text-xs text-amber-600">Correct</span>
                        </div>
                      </div>
                      <Input
                        {...register(`option${opt}` as 'optionA' | 'optionB' | 'optionC' | 'optionD')}
                        placeholder={
                          opt === 'A' ? 'e.g. A-i, B-ii, C-iii, D-iv' :
                          opt === 'B' ? 'e.g. A-ii, B-i, C-iv, D-iii' :
                          opt === 'C' ? 'e.g. A-iii, B-iv, C-i, D-ii' :
                          'e.g. A-iv, B-iii, C-ii, D-i'
                        }
                        className="bg-white border-amber-200 focus:border-amber-400 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Numerical Answer Section — untouched */}
          {questionType === 'numerical' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between">
                <Label className="text-blue-800 font-medium">Correct Answer</Label>
                <div className="flex rounded-lg border border-blue-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setNumericalAnswerType('exact')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      numericalAnswerType === 'exact'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    Exact Value
                  </button>
                  <button
                    type="button"
                    onClick={() => setNumericalAnswerType('range')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      numericalAnswerType === 'range'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    Range
                  </button>
                </div>
              </div>

              {numericalAnswerType === 'exact' && (
                <div className="space-y-1">
                  <Label className="text-sm text-blue-700">Answer Value</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 6.5"
                    {...register('correctAnswerExact', { valueAsNumber: true })}
                    className="max-w-xs"
                  />
                  {errors.correctAnswerExact && (
                    <p className="text-xs text-red-500">{errors.correctAnswerExact.message}</p>
                  )}
                </div>
              )}

              {numericalAnswerType === 'range' && (
                <div className="flex items-center gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm text-blue-700">Min Value</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 2.45"
                      {...register('correctAnswerMin', { valueAsNumber: true })}
                      className="max-w-[150px]"
                    />
                    {errors.correctAnswerMin && (
                      <p className="text-xs text-red-500">{errors.correctAnswerMin.message}</p>
                    )}
                  </div>
                  <span className="text-blue-400 mt-5">to</span>
                  <div className="space-y-1">
                    <Label className="text-sm text-blue-700">Max Value</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 2.55"
                      {...register('correctAnswerMax', { valueAsNumber: true })}
                      className="max-w-[150px]"
                    />
                    {errors.correctAnswerMax && (
                      <p className="text-xs text-red-500">{errors.correctAnswerMax.message}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Difficulty / Marks / Negative — untouched */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <select
                {...register('difficulty')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Marks (+)</Label>
              <Input type="number" step="0.5" {...register('marks', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Negative (-)</Label>
              <Input type="number" step="0.25" {...register('negativeMarks', { valueAsNumber: true })} />
            </div>
          </div>

          {/* Explanation — untouched */}
          <div className="space-y-2">
            <Label>Explanation (Optional)</Label>
            <Controller
              name="explanation"
              control={control}
              render={({ field }) => (
                <RichTextEditor
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Why is this the correct answer?"
                  minHeight="80px"
                />
              )}
            />
          </div>

          {/* Active Status — untouched */}
          {isEditMode && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...register('isActive')}
                id="isActive"
                className="rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active (visible to students)
              </Label>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className={duplicateWarning && !isEditMode ? 'opacity-75' : ''}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : isEditMode ? (
                <Save className="w-4 h-4 mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {isEditMode ? 'Update Question' : 'Save & Add Next Question'}
            </Button>

            {mode === 'dialog' && (
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>

        </form>
      </CardContent>
    </CardWrapper>
  );
}