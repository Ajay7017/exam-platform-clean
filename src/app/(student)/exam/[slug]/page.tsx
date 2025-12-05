// src/app/(student)/exam/[slug]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ExamProvider, useExam } from '@/contexts/ExamContext';
import { ExamTimer } from '@/components/exam/ExamTimer';
import { QuestionDisplay } from '@/components/exam/QuestionDisplay';
import { QuestionPalette } from '@/components/exam/QuestionPalette';
import { ExamInstructions } from '@/components/exam/ExamInstructions';
import { SubmitExamDialog } from '@/components/exam/SubmitExamDialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Flag, Send } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import mock data
import examsData from '@/data/exams.json';
import questionsData from '@/data/questions.json';

function ExamInterfaceContent() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id as string;

  const {
    examState,
    initializeExam,
    goToQuestion,
    selectAnswer,
    clearAnswer,
    markForReview,
    unmarkForReview,
    nextQuestion,
    previousQuestion,
    clearExamState,
  } = useExam();

  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Load exam and questions
  useEffect(() => {
    const foundExam = examsData.exams.find((e) => e.id === examId);
    if (foundExam) {
      setExam(foundExam);
      // In real app, fetch questions for this exam
      // For now, use first N questions
      const examQuestions = questionsData.questions.slice(0, foundExam.totalQuestions);
      setQuestions(examQuestions);

      // Initialize exam state if not already initialized
      if (!examState || examState.examId !== examId) {
        const questionIds = examQuestions.map((q) => q.id);
        initializeExam(examId, questionIds, foundExam.duration);
      }
    }
  }, [examId]);

  // Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            alert('Warning: Excessive tab switching detected. This may be reported.');
          }
          return newCount;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Prevent page refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleTimeUp = () => {
    alert('Time is up! Submitting exam...');
    handleSubmit();
  };

  const handleSubmit = () => {
    // Calculate results
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;

    questions.forEach((q) => {
      const userAnswer = examState?.answers[q.id];
      if (!userAnswer) {
        unattempted++;
      } else if (userAnswer === q.correctAnswer) {
        correct++;
      } else {
        wrong++;
      }
    });

    const score = correct * 1 - wrong * 0.25;

    // Create result object
    const result = {
      id: `result-${Date.now()}`,
      examId: examId,
      examTitle: exam.title,
      score: score,
      totalMarks: exam.totalMarks,
      percentage: (score / exam.totalMarks) * 100,
      correct,
      wrong,
      unattempted,
      timeTaken: exam.duration * 60 - (examState?.timeLeft || 0),
      submittedAt: new Date().toISOString(),
    };

    // Store result in localStorage
    const existingResults = JSON.parse(localStorage.getItem('exam-results') || '[]');
    existingResults.push(result);
    localStorage.setItem('exam-results', JSON.stringify(existingResults));

    // Clear exam state
    clearExamState();

    // Redirect to results
    router.push(`/results/${result.id}`);
  };

  const handleSubmitClick = () => {
    setShowSubmitDialog(true);
  };

  if (!exam || !questions.length || !examState) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading exam...</p>
      </div>
    );
  }

  const currentQuestion = questions[examState.currentQuestionIndex];
  const selectedAnswer = examState.answers[currentQuestion.id] || null;
  const isMarked = examState.markedForReview.includes(currentQuestion.id);

  // Calculate stats
  const stats = {
    answered: 0,
    notAnswered: 0,
    marked: 0,
    notVisited: 0,
    total: questions.length,
  };

  Object.values(examState.questionStates).forEach((status) => {
    if (status === 'answered' || status === 'answered-marked') {
      stats.answered++;
    } else if (status === 'not-answered') {
      stats.notAnswered++;
    } else if (status === 'marked') {
      stats.marked++;
    } else if (status === 'not-visited') {
      stats.notVisited++;
    }
  });

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">{exam.title}</h1>
          {tabSwitchCount > 0 && (
            <span className="text-sm text-orange-600">
              Tab Switches: {tabSwitchCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <ExamTimer durationMinutes={exam.duration} onTimeUp={handleTimeUp} />
          <Button onClick={handleSubmitClick} className="gap-2">
            <Send className="w-4 h-4" />
            Submit
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Question Palette (Desktop) */}
        <aside className="hidden lg:block w-80 border-r overflow-y-auto">
          <QuestionPalette
            totalQuestions={questions.length}
            currentQuestion={examState.currentQuestionIndex}
            questionStates={examState.questionStates}
            questionIds={questions.map((q) => q.id)}
            onQuestionSelect={goToQuestion}
          />
        </aside>

        {/* Center - Question Display */}
        <main className="flex-1 overflow-y-auto p-6">
          <QuestionDisplay
            question={currentQuestion}
            questionNumber={examState.currentQuestionIndex + 1}
            totalQuestions={questions.length}
            selectedOption={selectedAnswer}
            isMarkedForReview={isMarked}
            onOptionSelect={(option) => selectAnswer(currentQuestion.id, option)}
            onClearResponse={() => clearAnswer(currentQuestion.id)}
            onMarkForReview={() => {
              if (isMarked) {
                unmarkForReview(currentQuestion.id);
              } else {
                markForReview(currentQuestion.id);
              }
            }}
          />
        </main>

        {/* Right Sidebar - Instructions (Desktop) */}
        <aside className="hidden xl:block w-80 border-l overflow-y-auto">
          <ExamInstructions
            totalQuestions={questions.length}
            duration={exam.duration}
            totalMarks={exam.totalMarks}
            positiveMarks={1}
            negativeMarks={0.25}
          />
        </aside>
      </div>

      {/* Bottom Navigation */}
      <footer className="border-t bg-card px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="outline"
            onClick={previousQuestion}
            disabled={examState.currentQuestionIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (isMarked) {
                  unmarkForReview(currentQuestion.id);
                } else {
                  markForReview(currentQuestion.id);
                }
                nextQuestion();
              }}
              className="gap-2"
            >
              <Flag className="w-4 h-4" />
              Mark & Next
            </Button>

            <Button onClick={nextQuestion} className="gap-2">
              Save & Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </footer>

      {/* Mobile Tabs for Palette and Instructions */}
      <div className="lg:hidden fixed bottom-20 left-0 right-0 bg-background border-t">
        <Tabs defaultValue="palette" className="w-full">
          <TabsList className="w-full rounded-none">
            <TabsTrigger value="palette" className="flex-1">
              Question Palette
            </TabsTrigger>
            <TabsTrigger value="instructions" className="flex-1">
              Instructions
            </TabsTrigger>
          </TabsList>
          <TabsContent value="palette" className="h-64 overflow-y-auto">
            <QuestionPalette
              totalQuestions={questions.length}
              currentQuestion={examState.currentQuestionIndex}
              questionStates={examState.questionStates}
              questionIds={questions.map((q) => q.id)}
              onQuestionSelect={goToQuestion}
            />
          </TabsContent>
          <TabsContent value="instructions" className="h-64 overflow-y-auto">
            <ExamInstructions
              totalQuestions={questions.length}
              duration={exam.duration}
              totalMarks={exam.totalMarks}
              positiveMarks={1}
              negativeMarks={0.25}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Submit Dialog */}
      <SubmitExamDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        onConfirm={handleSubmit}
        stats={stats}
      />
    </div>
  );
}

// Main page with provider
export default function ExamPage() {
  return (
    <ExamProvider>
      <ExamInterfaceContent />
    </ExamProvider>
  );
}