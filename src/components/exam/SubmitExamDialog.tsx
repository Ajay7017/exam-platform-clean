// src/components/exam/SubmitExamDialog.tsx
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

interface SubmitExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  stats: {
    answered: number;
    notAnswered: number;
    marked: number;
    notVisited: number;
    total: number;
  };
}

export function SubmitExamDialog({
  open,
  onOpenChange,
  onConfirm,
  stats,
}: SubmitExamDialogProps) {
  const unanswered = stats.notAnswered + stats.notVisited;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Are you sure you want to submit this exam? You cannot change your
                answers after submission.
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted rounded-lg">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total Questions</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Answered</p>
                  <p className="text-2xl font-bold text-green-600">{stats.answered}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Not Answered</p>
                  <p className="text-2xl font-bold text-red-600">{stats.notAnswered}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Marked for Review</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.marked}</p>
                </div>
              </div>

              {/* Warning if unanswered questions exist */}
              {unanswered > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                    Warning
                  </Badge>
                  <p className="text-sm text-yellow-800">
                    You have <strong>{unanswered}</strong> unanswered question(s). These will be
                    marked as incorrect.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Review Again</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-primary">
            Submit Exam
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}