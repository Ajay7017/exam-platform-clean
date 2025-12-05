// src/hooks/useTimer.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseTimerProps {
  durationMinutes: number;
  onTimeUp: () => void;
  isPaused?: boolean;
}

interface UseTimerReturn {
  timeLeft: number; // in seconds
  minutes: number;
  seconds: number;
  isWarning: boolean; // < 5 minutes
  isCritical: boolean; // < 1 minute
  formatTime: () => string;
  pause: () => void;
  resume: () => void;
}

export function useTimer({ 
  durationMinutes, 
  onTimeUp, 
  isPaused = false 
}: UseTimerProps): UseTimerReturn {
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [paused, setPaused] = useState(isPaused);

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [paused, onTimeUp]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isWarning = timeLeft <= 300 && timeLeft > 60; // 5 min warning
  const isCritical = timeLeft <= 60; // 1 min critical

  const formatTime = useCallback(() => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [minutes, seconds]);

  const pause = () => setPaused(true);
  const resume = () => setPaused(false);

  return {
    timeLeft,
    minutes,
    seconds,
    isWarning,
    isCritical,
    formatTime,
    pause,
    resume,
  };
}