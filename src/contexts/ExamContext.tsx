// src/contexts/ExamContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ExamState, QuestionStatus } from '@/types/exam';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface ExamContextType {
  examState: ExamState | null;
  initializeExam: (examId: string, questionIds: string[], duration: number) => void;
  goToQuestion: (index: number) => void;
  selectAnswer: (questionId: string, option: string) => void;
  selectNumericalAnswer: (questionId: string, value: number) => void;
  clearAnswer: (questionId: string) => void;
  markForReview: (questionId: string) => void;
  unmarkForReview: (questionId: string) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  submitExam: () => void;
  updateTimeLeft: (seconds: number) => void;
  incrementTabSwitch: () => void;
  getQuestionStatus: (questionId: string) => QuestionStatus;
  clearExamState: () => void;
  // ✅ NEW: expose accumulated time per question (read-only for consumers)
  getTimePerQuestion: () => Record<string, number>;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

export function ExamProvider({ children }: { children: React.ReactNode }) {
  const [examState, setExamState, clearStoredState] = useLocalStorage<ExamState | null>(
    'exam-state',
    null
  );

  // ✅ NEW: per-question time tracking (in-memory only — flushed to DB on every save-batch)
  //
  // timePerQuestion : accumulated seconds per questionId
  // questionEnteredAt: timestamp (ms) when the student last LANDED on the current question
  //                    null means no question is currently being timed
  //
  // We use refs (not state) so that updates never trigger re-renders and
  // never go stale inside intervals / event handlers.
  const timePerQuestion   = useRef<Record<string, number>>({})
  const questionEnteredAt = useRef<number | null>(null)

  // ── helpers ────────────────────────────────────────────────────────────────

  /** Call whenever the student LEAVES a question (before switching away). */
  const pauseQuestionTimer = (questionId: string) => {
    if (questionEnteredAt.current === null) return
    const elapsed = Math.floor((Date.now() - questionEnteredAt.current) / 1000)
    timePerQuestion.current[questionId] =
      (timePerQuestion.current[questionId] || 0) + elapsed
    questionEnteredAt.current = null
  }

  /** Call whenever the student ARRIVES on a question. */
  const resumeQuestionTimer = () => {
    questionEnteredAt.current = Date.now()
  }

  /** Read-only snapshot for save-batch / submit. */
  const getTimePerQuestion = (): Record<string, number> => {
    // If a question is currently being viewed, include the in-flight elapsed
    // time so the save is as accurate as possible.
    if (examState && questionEnteredAt.current !== null) {
      const questionIds = Object.keys(examState.questionStates)
      const currentId   = questionIds[examState.currentQuestionIndex]
      if (currentId) {
        const inFlight = Math.floor((Date.now() - questionEnteredAt.current) / 1000)
        return {
          ...timePerQuestion.current,
          [currentId]: (timePerQuestion.current[currentId] || 0) + inFlight,
        }
      }
    }
    return { ...timePerQuestion.current }
  }

  // ── tab-visibility: pause/resume when student switches tabs ───────────────
  useEffect(() => {
    if (!examState) return

    const handleVisibilityChange = () => {
      if (!examState) return
      const questionIds = Object.keys(examState.questionStates)
      const currentId   = questionIds[examState.currentQuestionIndex]
      if (!currentId) return

      if (document.hidden) {
        // Tab hidden → pause
        pauseQuestionTimer(currentId)
      } else {
        // Tab visible again → resume
        resumeQuestionTimer()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [examState])

  // Auto-save every 30 seconds — UNCHANGED
  useEffect(() => {
    if (!examState) return

    const interval = setInterval(() => {
      console.log('Auto-saving exam state...')
      setExamState({ ...examState })
    }, 30000)

    return () => clearInterval(interval)
  }, [examState, setExamState])

  // ── core actions ───────────────────────────────────────────────────────────

  const initializeExam = (examId: string, questionIds: string[], duration: number) => {
    const initialStates: Record<string, QuestionStatus> = {};
    questionIds.forEach((id) => {
      initialStates[id] = 'not-visited';
    });

    const newState: ExamState = {
      examId,
      currentQuestionIndex: 0,
      answers: {},
      questionStates: initialStates,
      markedForReview: [],
      visitedQuestions: [],
      timeLeft: duration * 60,
      startTime: new Date(),
      tabSwitchCount: 0,
    };

    // ✅ NEW: reset time tracking on fresh exam
    timePerQuestion.current   = {}
    questionEnteredAt.current = null

    setExamState(newState);
  };

  const goToQuestion = (index: number) => {
    if (!examState) return;

    const questionIds  = Object.keys(examState.questionStates);
    const leavingId    = questionIds[examState.currentQuestionIndex]
    const arrivingId   = questionIds[index]

    // ✅ NEW: pause timer on the question we're leaving, start on the one we're arriving at
    if (leavingId) pauseQuestionTimer(leavingId)
    if (arrivingId) resumeQuestionTimer()

    if (!examState.visitedQuestions.includes(arrivingId)) {
      setExamState({
        ...examState,
        currentQuestionIndex: index,
        visitedQuestions: [...examState.visitedQuestions, arrivingId],
        questionStates: {
          ...examState.questionStates,
          [arrivingId]: examState.answers[arrivingId] !== undefined ? 'answered' : 'not-answered',
        },
      });
    } else {
      setExamState({
        ...examState,
        currentQuestionIndex: index,
      });
    }
  };

  // ✅ EXISTING: MCQ answer — untouched
  const selectAnswer = (questionId: string, option: string) => {
    if (!examState) return;

    const isMarked = examState.markedForReview.includes(questionId);

    setExamState({
      ...examState,
      answers: {
        ...examState.answers,
        [questionId]: option,
      },
      questionStates: {
        ...examState.questionStates,
        [questionId]: isMarked ? 'answered-marked' : 'answered',
      },
    });
  };

  // ✅ EXISTING: NAT answer — untouched
  const selectNumericalAnswer = (questionId: string, value: number) => {
    if (!examState) return;

    const isMarked = examState.markedForReview.includes(questionId);

    setExamState({
      ...examState,
      answers: {
        ...examState.answers,
        [questionId]: value,
      },
      questionStates: {
        ...examState.questionStates,
        [questionId]: isMarked ? 'answered-marked' : 'answered',
      },
    });
  };

  const clearAnswer = (questionId: string) => {
    if (!examState) return;

    const newAnswers = { ...examState.answers };
    delete newAnswers[questionId];

    const isMarked = examState.markedForReview.includes(questionId);

    setExamState({
      ...examState,
      answers: newAnswers,
      questionStates: {
        ...examState.questionStates,
        [questionId]: isMarked ? 'marked' : 'not-answered',
      },
    });
  };

  const markForReview = (questionId: string) => {
    if (!examState) return;

    const hasAnswer = examState.answers[questionId] !== undefined;

    setExamState({
      ...examState,
      markedForReview: [...examState.markedForReview, questionId],
      questionStates: {
        ...examState.questionStates,
        [questionId]: hasAnswer ? 'answered-marked' : 'marked',
      },
    });
  };

  const unmarkForReview = (questionId: string) => {
    if (!examState) return;

    const hasAnswer = examState.answers[questionId] !== undefined;

    setExamState({
      ...examState,
      markedForReview: examState.markedForReview.filter((id) => id !== questionId),
      questionStates: {
        ...examState.questionStates,
        [questionId]: hasAnswer ? 'answered' : 'not-answered',
      },
    });
  };

  const nextQuestion = () => {
    if (!examState) return;
    const totalQuestions = Object.keys(examState.questionStates).length;
    if (examState.currentQuestionIndex < totalQuestions - 1) {
      goToQuestion(examState.currentQuestionIndex + 1);
    }
  };

  const previousQuestion = () => {
    if (!examState) return;
    if (examState.currentQuestionIndex > 0) {
      goToQuestion(examState.currentQuestionIndex - 1);
    }
  };

  const submitExam = () => {
    // ✅ NEW: flush final in-flight time before submit signal
    if (examState) {
      const questionIds = Object.keys(examState.questionStates)
      const currentId   = questionIds[examState.currentQuestionIndex]
      if (currentId) pauseQuestionTimer(currentId)
    }
    console.log('Exam submitted!');
  };

  const updateTimeLeft = (seconds: number) => {
    if (!examState) return;
    setExamState({
      ...examState,
      timeLeft: seconds,
    });
  };

  const incrementTabSwitch = () => {
    if (!examState) return;
    setExamState({
      ...examState,
      tabSwitchCount: examState.tabSwitchCount + 1,
    });
  };

  const getQuestionStatus = (questionId: string): QuestionStatus => {
    if (!examState) return 'not-visited';
    return examState.questionStates[questionId] || 'not-visited';
  };

  const clearExamState = () => {
    // ✅ NEW: also reset time tracking refs
    timePerQuestion.current   = {}
    questionEnteredAt.current = null
    clearStoredState();
  };

  return (
    <ExamContext.Provider
      value={{
        examState,
        initializeExam,
        goToQuestion,
        selectAnswer,
        selectNumericalAnswer,
        clearAnswer,
        markForReview,
        unmarkForReview,
        nextQuestion,
        previousQuestion,
        submitExam,
        updateTimeLeft,
        incrementTabSwitch,
        getQuestionStatus,
        clearExamState,
        getTimePerQuestion, // ✅ NEW
      }}
    >
      {children}
    </ExamContext.Provider>
  );
}

export function useExam() {
  const context = useContext(ExamContext);
  if (context === undefined) {
    throw new Error('useExam must be used within an ExamProvider');
  }
  return context;
}