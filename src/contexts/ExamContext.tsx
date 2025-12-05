// src/contexts/ExamContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ExamState, QuestionStatus } from '@/types/exam';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface ExamContextType {
  examState: ExamState | null;
  initializeExam: (examId: string, questionIds: string[], duration: number) => void;
  goToQuestion: (index: number) => void;
  selectAnswer: (questionId: string, option: string) => void;
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
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

export function ExamProvider({ children }: { children: React.ReactNode }) {
  const [examState, setExamState, clearStoredState] = useLocalStorage<ExamState | null>(
    'exam-state',
    null
  );

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!examState) return;

    const interval = setInterval(() => {
      console.log('Auto-saving exam state...');
      setExamState({ ...examState });
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [examState, setExamState]);

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

    setExamState(newState);
  };

  const goToQuestion = (index: number) => {
    if (!examState) return;
    
    const questionIds = Object.keys(examState.questionStates);
    const questionId = questionIds[index];
    
    if (!examState.visitedQuestions.includes(questionId)) {
      setExamState({
        ...examState,
        currentQuestionIndex: index,
        visitedQuestions: [...examState.visitedQuestions, questionId],
        questionStates: {
          ...examState.questionStates,
          [questionId]: examState.answers[questionId] ? 'answered' : 'not-answered',
        },
      });
    } else {
      setExamState({
        ...examState,
        currentQuestionIndex: index,
      });
    }
  };

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

    const hasAnswer = !!examState.answers[questionId];

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

    const hasAnswer = !!examState.answers[questionId];

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
    // Will handle submission in the component
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
    clearStoredState();
  };

  return (
    <ExamContext.Provider
      value={{
        examState,
        initializeExam,
        goToQuestion,
        selectAnswer,
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