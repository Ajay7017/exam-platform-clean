// src/components/admin/QuestionForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Plus, Save, ArrowLeft } from 'lucide-react';
import { RichTextEditor } from '@/components/admin/RichTextEditor';

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim();

const questionSchema = z.object({
  statement: z.string().refine((v) => stripHtml(v).length >= 5, {
    message: 'Question statement is required (min 5 characters)',
  }),
  subjectId: z.string().min(1, 'Subject is required'),
  topicId: z.string().optional(),
  topicName: z.string().optional(),
  subTopicId: z.string().optional(),
  subTopicName: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  marks: z.number().min(0.5),
  negativeMarks: z.number().min(0),
  optionA: z.string().refine((v) => stripHtml(v).length >= 1, { message: 'Option A is required' }),
  optionB: z.string().refine((v) => stripHtml(v).length >= 1, { message: 'Option B is required' }),
  optionC: z.string().refine((v) => stripHtml(v).length >= 1, { message: 'Option C is required' }),
  optionD: z.string().refine((v) => stripHtml(v).length >= 1, { message: 'Option D is required' }),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string().optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => data.topicId || data.topicName,
  { message: 'Topic is required', path: ['topicId'] }
).refine(
  (data) => data.subTopicId || data.subTopicName,
  { message: 'SubTopic is required', path: ['subTopicId'] }
);

type QuestionFormData = z.infer<typeof questionSchema>;

interface Subject {
  id: string;
  name: string;
  slug: string;
}

interface Topic {
  id: string;
  name: string;
  slug: string;
  subjectId: string;
}

interface SubTopic {
  id: string;
  name: string;
  slug: string;
  topicId: string;
}

interface QuestionFormProps {
  questionId?: string;
  initialData?: Partial<QuestionFormData>;
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'standalone' | 'dialog';
}

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
  const [selectedTopicId, setSelectedTopicId] = useState<string>(''); // ✅ FIX: track separately
  const [topicMode, setTopicMode] = useState<'select' | 'create'>('select');
  const [subTopicMode, setSubTopicMode] = useState<'select' | 'create'>('select');
  
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
    resolver: zodResolver(questionSchema),
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
    },
  });

  const watchSubjectId = watch('subjectId');
  const watchTopicId = watch('topicId');

  // ✅ FIX: Single init effect — fetches subjects, topics, subtopics all at once.
  // In edit mode (initialData has subjectId/topicId/subTopicId), all three are
  // fetched in parallel so there's no race condition between chained effects.
  useEffect(() => {
    const init = async () => {
      setLoadingSubjects(true);

      try {
        // Always fetch subjects
        const subjectsRes = await fetch('/api/admin/subjects?isActive=true');
        if (!subjectsRes.ok) throw new Error('Failed to fetch subjects');
        const subjectsData = await subjectsRes.json();
        setSubjects(subjectsData || []);

        // If edit mode — also fetch topics and subtopics in parallel
        if (initialData?.subjectId && initialData?.topicId) {
          setSelectedSubjectId(initialData.subjectId);
          setSelectedTopicId(initialData.topicId);
          // re-set subjectId after subjects load so <select> can match the option
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

          // Restore selected topic
          if (topicsData?.length > 0) {
            setTopicMode('select');
            setValue('topicId', initialData.topicId);
          } else {
            setTopicMode('create');
          }

          // Restore selected subtopic
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
  }, []); // runs once on mount only

  // Fetch topics when user manually changes subject
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

  // Fetch subtopics when user manually changes topic
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

  // Load question data if in edit mode and no initialData provided
  useEffect(() => {
    if (questionId && !initialData) {
      const fetchQuestion = async () => {
        try {
          const res = await fetch(`/api/admin/questions/${questionId}`);
          const data = await res.json();
          if (data.question) {
            reset(data.question);
          }
        } catch (e) {
          toast.error('Failed to load question');
        }
      };
      fetchQuestion();
    }
  }, [questionId, initialData, reset]);

  const onSubmit = async (data: QuestionFormData) => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        statement: data.statement,
        difficulty: data.difficulty,
        marks: data.marks,
        negativeMarks: data.negativeMarks,
        optionA: data.optionA,
        optionB: data.optionB,
        optionC: data.optionC,
        optionD: data.optionD,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation,
        isActive: data.isActive,
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
      } else {
        throw new Error('Please select or create a subtopic');
      }

      const url = isEditMode 
        ? `/api/admin/questions/${questionId}` 
        : '/api/admin/questions';
      
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save question');

      toast.success(isEditMode ? 'Question updated successfully' : 'Question saved successfully');

      if (onSuccess) {
        onSuccess();
      } else if (!isEditMode) {
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
        });
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Subject / Topic / SubTopic Row */}
          <div className="grid gap-6 md:grid-cols-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
            
            {/* Subject */}
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
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              {errors.subjectId && <p className="text-xs text-red-500">{errors.subjectId.message}</p>}
            </div>

            {/* Topic */}
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
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Input {...register('topicName')} placeholder="e.g. Thermodynamics" />
              )}
              
              {(errors.topicId || errors.topicName) && (
                <p className="text-xs text-red-500">
                  {errors.topicId?.message || errors.topicName?.message}
                </p>
              )}
              {topics.length === 0 && watchSubjectId && !loadingTopics && (
                <p className="text-xs text-muted-foreground">No topics found. Create a new one.</p>
              )}
            </div>

            {/* SubTopic */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>SubTopic *</Label>
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
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Input {...register('subTopicName')} placeholder="e.g. Boyle's Law" />
              )}

              {(errors.subTopicId || errors.subTopicName) && (
                <p className="text-xs text-red-500">
                  {errors.subTopicId?.message || errors.subTopicName?.message}
                </p>
              )}
              {subTopics.length === 0 && (watchTopicId || topicMode === 'create') && !loadingSubTopics && (
                <p className="text-xs text-muted-foreground">No subtopics found. Create a new one.</p>
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
          </div>

          {/* Options Grid */}
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
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={`Option ${opt} text`}
                      minHeight="60px"
                    />
                  )}
                />
                {errors[`option${opt}` as keyof QuestionFormData] && (
                  <p className="text-xs text-red-500">
                    {errors[`option${opt}` as keyof QuestionFormData]?.message as string}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Difficulty / Marks / Negative */}
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

          {/* Explanation */}
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

          {/* Active Status for Edit Mode */}
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
            <Button type="submit" size="lg" disabled={isSubmitting}>
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