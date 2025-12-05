// src/components/exam/QuestionPalette.tsx
'use client';

import { QuestionStatus } from '@/types/exam';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface QuestionPaletteProps {
  totalQuestions: number;
  currentQuestion: number;
  questionStates: Record<string, QuestionStatus>;
  questionIds: string[];
  onQuestionSelect: (index: number) => void;
}

const statusConfig = {
  'not-visited': {
    bg: 'bg-gray-200 hover:bg-gray-300',
    text: 'text-gray-700',
    label: 'Not Visited',
    color: 'bg-gray-400',
  },
  'not-answered': {
    bg: 'bg-red-100 hover:bg-red-200',
    text: 'text-red-700',
    label: 'Not Answered',
    color: 'bg-red-500',
  },
  answered: {
    bg: 'bg-green-100 hover:bg-green-200',
    text: 'text-green-700',
    label: 'Answered',
    color: 'bg-green-500',
  },
  marked: {
    bg: 'bg-yellow-100 hover:bg-yellow-200',
    text: 'text-yellow-700',
    label: 'Marked for Review',
    color: 'bg-yellow-500',
  },
  'answered-marked': {
    bg: 'bg-purple-100 hover:bg-purple-200',
    text: 'text-purple-700',
    label: 'Answered & Marked',
    color: 'bg-purple-500',
  },
};

export function QuestionPalette({
  totalQuestions,
  currentQuestion,
  questionStates,
  questionIds,
  onQuestionSelect,
}: QuestionPaletteProps) {
  // Calculate stats
  const stats = {
    answered: 0,
    notAnswered: 0,
    notVisited: 0,
    marked: 0,
  };

  Object.values(questionStates).forEach((status) => {
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
    <Card className="h-full border-none shadow-none">
      <CardHeader className="border-b bg-muted/50">
        <CardTitle className="text-base">Question Palette</CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-6">
        {/* Legend */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase">
            Legend
          </h4>
          <div className="grid grid-cols-1 gap-2 text-xs">
            {Object.entries(statusConfig).map(([status, config]) => (
              <div key={status} className="flex items-center gap-2">
                <div className={cn('w-3 h-3 rounded', config.color)} />
                <span>{config.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase">
            Statistics
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-green-50">
              <span className="text-green-700">Answered</span>
              <Badge variant="secondary">{stats.answered}</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-red-50">
              <span className="text-red-700">Not Answered</span>
              <Badge variant="secondary">{stats.notAnswered}</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-yellow-50">
              <span className="text-yellow-700">Marked</span>
              <Badge variant="secondary">{stats.marked}</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-gray-50">
              <span className="text-gray-700">Not Visited</span>
              <Badge variant="secondary">{stats.notVisited}</Badge>
            </div>
          </div>
        </div>

        {/* Question Grid */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase">
            Questions
          </h4>
          <div className="grid grid-cols-5 gap-2">
            {questionIds.map((qId, index) => {
              const status = questionStates[qId] || 'not-visited';
              const config = statusConfig[status];
              const isCurrent = index === currentQuestion;

              return (
                <button
                  key={qId}
                  onClick={() => onQuestionSelect(index)}
                  className={cn(
                    'aspect-square rounded-lg font-semibold text-sm transition-all',
                    config.bg,
                    config.text,
                    isCurrent && 'ring-2 ring-primary ring-offset-2'
                  )}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}