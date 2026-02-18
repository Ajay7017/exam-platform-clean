// src/components/exam/QuestionDisplay.tsx
'use client';

import { SafeHtml } from '@/lib/utils/safe-html';
import { Question } from '@/types/exam';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flag, X } from 'lucide-react';

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedOption: string | null;
  isMarkedForReview: boolean;
  onOptionSelect: (option: string) => void;
  onClearResponse: () => void;
  onMarkForReview: () => void;
}

export function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  selectedOption,
  isMarkedForReview,
  onOptionSelect,
  onClearResponse,
  onMarkForReview,
}: QuestionDisplayProps) {
  return (
    <Card className="h-full border-none shadow-none">
      <CardHeader className="border-b bg-muted/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">
            Question {questionNumber} of {totalQuestions}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-600">
              +{question.marks}
            </Badge>
            {question.negativeMarks > 0 && (
              <Badge variant="outline" className="text-red-600">
                -{question.negativeMarks}
              </Badge>
            )}
            <Badge variant="secondary">{question.difficulty}</Badge>
            <Badge variant="outline">{question.topic}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Question Statement */}
        <div className="text-base leading-relaxed">
          <SafeHtml html={question.statement} />
        </div>

        {/* Options */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">
            Select your answer:
          </h4>
          <RadioGroup value={selectedOption || ''} onValueChange={onOptionSelect}>
            {question.options.map((option) => (
              <div
                key={option.key}
                className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer hover:bg-muted/50 ${
                  selectedOption === option.key
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
                onClick={() => onOptionSelect(option.key)}
              >
                <RadioGroupItem value={option.key} id={option.key} className="mt-1 shrink-0" />
                <Label htmlFor={option.key} className="flex-1 cursor-pointer">
                  <span className="font-semibold mr-2">{option.key}.</span>
                  <SafeHtml html={option.text} className="inline" />
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button
            variant={isMarkedForReview ? 'default' : 'outline'}
            onClick={onMarkForReview}
            className="flex items-center gap-2"
          >
            <Flag className="w-4 h-4" />
            {isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
          </Button>

          {selectedOption && (
            <Button
              variant="outline"
              onClick={onClearResponse}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear Response
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}