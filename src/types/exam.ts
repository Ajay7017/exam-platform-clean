// src/types/exam.ts

export interface Exam {
  id: string;
  title: string;
  slug: string;
  subject: string;
  subjectSlug: string;
  thumbnail: string;
  duration: number; // in minutes
  totalQuestions: number;
  totalMarks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  price: number;
  isFree: boolean;
  isPurchased: boolean;
  rating: number;
  totalAttempts: number;
  topics: string[];
}

export interface Question {
  id: string;
  statement: string;
  imageUrl: string | null;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  negativeMarks: number;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string;
}

export interface QuestionOption {
  key: string;
  text: string;
  imageUrl: string | null;
}

export type QuestionStatus = 
  | 'not-visited'    // Not clicked yet (white/gray)
  | 'not-answered'   // Visited but no answer (red)
  | 'answered'       // Answered (green)
  | 'marked'         // Marked for review (orange/yellow)
  | 'answered-marked'; // Answered + marked (purple)

export interface ExamState {
  examId: string;
  currentQuestionIndex: number;
  answers: Record<string, string>; // questionId -> selectedOption
  questionStates: Record<string, QuestionStatus>;
  markedForReview: string[]; // questionIds
  visitedQuestions: string[]; // questionIds
  timeLeft: number; // in seconds
  startTime: Date;
  tabSwitchCount: number;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  userId: string;
  startedAt: Date;
  submittedAt?: Date;
  timeSpent: number; // in seconds
  answers: Record<string, string>;
  score: number;
  totalMarks: number;
  percentage: number;
  rank?: number;
}
// ============================================
// LEADERBOARD TYPES
// ============================================

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userImage?: string | null;
  score: number;
  percentage: number;
  timeTaken: number; // in seconds
  submittedAt: string;
  isCurrentUser?: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentUserEntry?: LeaderboardEntry;
  totalParticipants: number;
  examTitle?: string;
  subjectName?: string;
  lastUpdated: string;
}

export type LeaderboardType = 'exam' | 'global' | 'subject';

export interface LeaderboardFilters {
  type: LeaderboardType;
  examId?: string;
  subjectId?: string;
  limit?: number;
}