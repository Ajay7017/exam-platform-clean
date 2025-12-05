// src/components/exam/ExamTimer.tsx
'use client';

import { Clock, AlertCircle } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';
import { useExam } from '@/contexts/ExamContext';
import { cn } from '@/lib/utils';

interface ExamTimerProps {
  durationMinutes: number;
  onTimeUp: () => void;
}

export function ExamTimer({ durationMinutes, onTimeUp }: ExamTimerProps) {
  const { updateTimeLeft } = useExam();
  const { formatTime, isWarning, isCritical, timeLeft } = useTimer({
    durationMinutes,
    onTimeUp,
  });

  // Update context with time left
  React.useEffect(() => {
    updateTimeLeft(timeLeft);
  }, [timeLeft, updateTimeLeft]);

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-semibold transition-all',
        isCritical && 'bg-red-100 text-red-700 animate-pulse',
        isWarning && !isCritical && 'bg-yellow-100 text-yellow-700',
        !isWarning && !isCritical && 'bg-gray-100 text-gray-700'
      )}
    >
      {(isWarning || isCritical) && (
        <AlertCircle className={cn('w-5 h-5', isCritical && 'animate-pulse')} />
      )}
      {!isWarning && !isCritical && <Clock className="w-5 h-5" />}
      <span>{formatTime()}</span>
    </div>
  );
}

// Add this import at the top
import React from 'react';