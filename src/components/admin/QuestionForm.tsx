// src/components/admin/QuestionForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Plus, Save, ArrowLeft } from 'lucide-react';

// Validation schema
const questionSchema = z.object({
  statement: z.string().min(5, 'Question statement is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  topicId: z.string().optional(),
  topicName: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  marks: z.number().min(0.5),
  negativeMarks: z.number().min(0),
  optionA: z.string().min(1, 'Option A is required'),
  optionB: z.string().min(1, 'Option B is required'),
  optionC: z.string().min(1, 'Option C is required'),
  optionD: z.string().min(1, 'Option D is required'),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string().optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => data.topicId || data.topicName,
  {
    message: 'Topic is required',
    path: ['topicId'],
  }
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
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [topicMode, setTopicMode] = useState<'select' | 'create'>('select');
  
  const isEditMode = !!questionId;

  const {
    register,
    handleSubmit,
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
    },
  });

  const watchSubjectId = watch('subjectId');

  // Fetch subjects on mount
  useEffect(() => {
    const fetchSubjects = async () => {
      setLoadingSubjects(true);
      try {
        const res = await fetch('/api/admin/subjects?isActive=true');
        if (!res.ok) throw new Error('Failed to fetch subjects');
        const data = await res.json();
        setSubjects(data || []);
      } catch (error) {
        console.error('Failed to fetch subjects:', error);
        toast.error('Failed to load subjects');
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, []);

  // Fetch topics when subject changes
  useEffect(() => {
    if (watchSubjectId && watchSubjectId !== selectedSubjectId) {
      setSelectedSubjectId(watchSubjectId);
      fetchTopicsForSubject(watchSubjectId);
    }
  }, [watchSubjectId]);

  const fetchTopicsForSubject = async (subjectId: string) => {
    if (!subjectId) {
      setTopics([]);
      return;
    }

    setLoadingTopics(true);
    try {
      const res = await fetch(`/api/admin/topics?subjectId=${subjectId}&isActive=true`);
      if (!res.ok) throw new Error('Failed to fetch topics');
      const data = await res.json();
      setTopics(data || []);
      
      // If topics exist, default to select mode
      if (data && data.length > 0) {
        setTopicMode('select');
      } else {
        setTopicMode('create');
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error);
      toast.error('Failed to load topics');
      setTopics([]);
      setTopicMode('create');
    } finally {
      setLoadingTopics(false);
    }
  };

  // Load question data if in edit mode
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
      // Prepare payload based on topic mode
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
        // Use existing topic
        payload.topicId = data.topicId;
      } else if (topicMode === 'create' && data.topicName) {
        // Create new topic
        payload.subjectId = data.subjectId;
        payload.topicName = data.topicName;
      } else {
        throw new Error('Please select or create a topic');
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
        // Efficient Reset for CREATE mode: Keep Context but clear Content
        reset({
          subjectId: data.subjectId,
          topicId: data.topicId,
          topicName: data.topicName,
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
        
        document.getElementById('statement')?.focus();
      }

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      window.history.back();
    }
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
          
          {/* Metadata Row */}
          <div className="grid gap-6 md:grid-cols-2 p-4 bg-slate-50 rounded-lg border border-slate-100">
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
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    {topicMode === 'select' ? '+ Create New' : 'Select Existing'}
                  </button>
                )}
              </div>

              {!watchSubjectId ? (
                <Input 
                  disabled 
                  placeholder="Select a subject first" 
                  className="disabled:cursor-not-allowed"
                />
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
                <Input 
                  {...register('topicName')} 
                  placeholder="e.g. Thermodynamics" 
                />
              )}
              
              {(errors.topicId || errors.topicName) && (
                <p className="text-xs text-red-500">
                  {errors.topicId?.message || errors.topicName?.message}
                </p>
              )}
              
              {topics.length === 0 && watchSubjectId && !loadingTopics && (
                <p className="text-xs text-muted-foreground">
                  No topics found. Create a new one.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Question Statement</Label>
            <Textarea 
              id="statement"
              {...register('statement')} 
              placeholder="Type your question here..." 
              className="min-h-[100px] text-lg"
            />
            {errors.statement && <p className="text-xs text-red-500">{errors.statement.message}</p>}
          </div>

          {/* Options Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {['A', 'B', 'C', 'D'].map((opt) => (
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
                <Input 
                  {...register(`option${opt}` as any)} 
                  placeholder={`Option ${opt} text`}
                />
                {errors[`option${opt}` as keyof QuestionFormData] && (
                  <p className="text-xs text-red-500">{errors[`option${opt}` as keyof QuestionFormData]?.message as string}</p>
                )}
              </div>
            ))}
          </div>

          {/* Settings Row */}
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

          <div className="space-y-2">
            <Label>Explanation (Optional)</Label>
            <Textarea {...register('explanation')} placeholder="Why is this the correct answer?" />
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