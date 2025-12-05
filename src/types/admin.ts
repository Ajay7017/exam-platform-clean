// src/types/admin.ts
// Admin-specific types
export interface Subject {
  id: string;
  name: string;
  slug: string;
  icon: string;
  totalQuestions: number;
  topics: Topic[];
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  questionCount: number;
}

export interface Question {
  id: string;
  statement: string;
  imageUrl: string | null;
  subject: string;
  subjectId: string;
  topic: string;
  topicId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  negativeMarks: number;
  status: 'active' | 'draft' | 'archived';
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionOption {
  key: string;
  text: string;
  imageUrl: string | null;
}

export interface AdminStats {
  totalQuestions: number;
  activeExams: number;
  totalUsers: number;
  revenue: number;
  questionsChange: string;
  examsChange: string;
  usersChange: string;
  revenueChange: string;
}

export interface RecentActivity {
  id: string;
  type: 'question' | 'exam' | 'user' | 'payment';
  action: string;
  description: string;
  timestamp: string;
  user?: string;
}