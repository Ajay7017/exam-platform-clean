// src/types/exam.ts

export interface Exam {
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
  rating: number;
  totalAttempts: number;
  topics: string[];
}

// ✅ NEW: Match pairs structure — display data only, correct answer lives in options
export interface MatchPairs {
  leftColumn: {
    header: string;
    items: string[];
  };
  rightColumn: {
    header: string;
    items: string[];
  };
}

export interface Question {
  id: string;
  statement: string;
  imageUrl: string | null;
  topic: string;
  subTopic?: string;
  subTopicId?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  negativeMarks: number;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  // ✅ UPDATED: added 'match' to type union
  type: 'mcq' | 'numerical' | 'match';
  correctAnswerExact?: number | null;
  correctAnswerMin?: number | null;
  correctAnswerMax?: number | null;
  // ✅ NEW: only populated when type === 'match'
  matchPairs?: MatchPairs | null;
}

export interface QuestionOption {
  key: string;
  text: string;
  imageUrl: string | null;
}

export type QuestionStatus = 
  | 'not-visited'
  | 'not-answered'
  | 'answered'
  | 'marked'
  | 'answered-marked';

export interface ExamState {
  examId: string;
  currentQuestionIndex: number;
  // ✅ EXISTING: answers support string (MCQ/Match) or number (NAT)
  answers: Record<string, string | number>;
  questionStates: Record<string, QuestionStatus>;
  markedForReview: string[];
  visitedQuestions: string[];
  timeLeft: number;
  startTime: Date;
  tabSwitchCount: number;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  userId: string;
  startedAt: Date;
  submittedAt?: Date;
  timeSpent: number;
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
  timeTaken: number;
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