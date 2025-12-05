// src/components/exam/ExamInstructions.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface ExamInstructionsProps {
  totalQuestions: number;
  duration: number;
  totalMarks: number;
  positiveMarks: number;
  negativeMarks: number;
}

export function ExamInstructions({
  totalQuestions,
  duration,
  totalMarks,
  positiveMarks,
  negativeMarks,
}: ExamInstructionsProps) {
  return (
    <Card className="h-full border-none shadow-none">
      <CardHeader className="border-b bg-muted/50">
        <CardTitle className="text-base">Instructions</CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-4 space-y-6">
            {/* General Instructions */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                General Instructions
              </h4>
              <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside">
                <li>Total Questions: <strong>{totalQuestions}</strong></li>
                <li>Total Duration: <strong>{duration} minutes</strong></li>
                <li>Total Marks: <strong>{totalMarks}</strong></li>
                <li>The exam will auto-submit when time expires</li>
                <li>Ensure stable internet connection throughout</li>
              </ul>
            </div>

            {/* Marking Scheme */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Marking Scheme
              </h4>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>
                    Correct Answer: <strong className="text-green-600">+{positiveMarks}</strong> mark(s)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>
                    Wrong Answer: <strong className="text-red-600">-{negativeMarks}</strong> mark(s)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex-shrink-0" />
                  <span>Unattempted: <strong>0</strong> marks</span>
                </li>
              </ul>
            </div>

            {/* Navigation Tips */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                Navigation Tips
              </h4>
              <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside">
                <li>Use the question palette to jump to any question</li>
                <li>Mark questions for review to revisit them later</li>
                <li>Use "Save & Next" to save your answer and move forward</li>
                <li>Clear response button removes your selected answer</li>
                <li>You can change your answers anytime before submitting</li>
              </ul>
            </div>

            {/* Important Notes */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Important Notes
              </h4>
              <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside">
                <li>Do not refresh or close the browser tab</li>
                <li>Switching tabs frequently may trigger warnings</li>
                <li>Your progress is auto-saved every 30 seconds</li>
                <li>Submit only when you've completed the exam</li>
                <li>You cannot resume after final submission</li>
              </ul>
            </div>

            {/* Question Status Legend */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Question Status</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-green-100 border border-green-300 flex items-center justify-center text-green-700 font-semibold">
                    1
                  </div>
                  <span className="text-muted-foreground">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-red-100 border border-red-300 flex items-center justify-center text-red-700 font-semibold">
                    2
                  </div>
                  <span className="text-muted-foreground">Not Answered (Visited)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-yellow-100 border border-yellow-300 flex items-center justify-center text-yellow-700 font-semibold">
                    3
                  </div>
                  <span className="text-muted-foreground">Marked for Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-purple-100 border border-purple-300 flex items-center justify-center text-purple-700 font-semibold">
                    4
                  </div>
                  <span className="text-muted-foreground">Answered & Marked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-700 font-semibold">
                    5
                  </div>
                  <span className="text-muted-foreground">Not Visited</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}