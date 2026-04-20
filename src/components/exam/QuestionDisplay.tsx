// src/components/exam/QuestionDisplay.tsx
'use client';

import { SafeHtml } from '@/lib/utils/safe-html';
import { Question } from '@/types/exam';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flag, X, Delete } from 'lucide-react';
import { useState, useEffect } from 'react';
import { OptimizedImage } from '@/components/ui/optimized-image';

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedOption: string | null;
  numericalAnswer?: number | null;
  isMarkedForReview: boolean;
  onOptionSelect: (option: string) => void;
  onNumericalAnswer?: (value: number) => void;
  onClearResponse: () => void;
  onMarkForReview: () => void;
}

// ── NumericalInput — UNTOUCHED ────────────────────────────────────────────
function NumericalInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number) => void;
}) {
  const [display, setDisplay] = useState(value !== null ? String(value) : '');

  useEffect(() => {
    setDisplay(value !== null ? String(value) : '');
  }, [value]);

  const handleButton = (key: string) => {
    setDisplay(prev => {
      let next = prev;
      if (key === 'backspace') {
        next = prev.slice(0, -1);
      } else if (key === '-') {
        if (prev.startsWith('-')) next = prev.slice(1);
        else next = '-' + prev;
      } else if (key === '.') {
        if (!prev.includes('.')) next = prev + '.';
      } else {
        if (prev === '0' && key !== '.') next = key;
        else next = prev + key;
      }
      const parsed = parseFloat(next);
      if (!isNaN(parsed) && next !== '-' && next !== '.') onChange(parsed);
      return next;
    });
  };

  const buttons = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['.', '0', '-'],
  ];

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="w-full max-w-xs bg-gray-900 text-white rounded-lg p-4 flex items-center justify-between min-h-[56px]">
        <span className="text-2xl font-mono tracking-widest">
          {display || '___'}
        </span>
        <button onClick={() => handleButton('backspace')} className="text-gray-400 hover:text-white transition-colors ml-2">
          <Delete className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
        {buttons.map((row, i) =>
          row.map((key) => (
            <button
              key={`${i}-${key}`}
              onClick={() => handleButton(key)}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-lg rounded-lg py-4 transition-colors"
            >
              {key}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── ✅ NEW: MatchTable — renders the two-column display ───────────────────
const LEFT_LABELS  = ['A', 'B', 'C', 'D', 'E', 'F'];
const RIGHT_LABELS = ['i', 'ii', 'iii', 'iv', 'v', 'vi'];

function MatchTable({ matchPairs }: { matchPairs: NonNullable<Question['matchPairs']> }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/60 border-b border-border">
            <th className="text-left px-4 py-2.5 font-medium w-1/2">
              {matchPairs.leftColumn.header}
            </th>
            <th className="text-left px-4 py-2.5 font-medium w-1/2">
              {matchPairs.rightColumn.header}
            </th>
          </tr>
        </thead>
        <tbody>
          {matchPairs.leftColumn.items.map((leftItem, index) => (
            <tr key={index} className="border-b border-border last:border-0">
              <td className="px-4 py-2.5 align-middle">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold mr-2 shrink-0">
                  {LEFT_LABELS[index]}
                </span>
                {leftItem}
              </td>
              <td className="px-4 py-2.5 align-middle">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-semibold mr-2 shrink-0">
                  {RIGHT_LABELS[index]}
                </span>
                {matchPairs.rightColumn.items[index]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  selectedOption,
  numericalAnswer,
  isMarkedForReview,
  onOptionSelect,
  onNumericalAnswer,
  onClearResponse,
  onMarkForReview,
}: QuestionDisplayProps) {

  const isNumerical = question.type === 'numerical';
  // ✅ NEW: match flag — used only to show the table and badge
  const isMatch = question.type === 'match';

  return (
    <Card className="h-full border-none shadow-none">
      <CardHeader className="border-b bg-muted/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">
            Question {questionNumber} of {totalQuestions}
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* ✅ NEW: Match badge */}
            {isMatch && (
              <Badge variant="outline" className="text-violet-600">
                Match
              </Badge>
            )}
            {/* UNTOUCHED: existing Numerical badge */}
            {isNumerical && (
              <Badge variant="outline" className="text-blue-600">
                Numerical
              </Badge>
            )}
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
        {/* Question Statement — UNTOUCHED */}
        <div className="text-base leading-relaxed">
          <SafeHtml html={question.statement} />
        </div>

        {/* ✅ NEW: Match table — only shown for match type */}
        {isMatch && question.matchPairs && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              Match the columns:
            </h4>
            <MatchTable matchPairs={question.matchPairs} />
          </div>
        )}

        {/* UNTOUCHED: MCQ options — the !isNumerical condition now correctly
            covers both 'mcq' and 'match' since both use A/B/C/D option picking */}
        {!isNumerical && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">
              {isMatch ? 'Select the correct combination:' : 'Select your answer:'}
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
        )}

        {/* UNTOUCHED: NAT calculator */}
        {isNumerical && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">
              Enter your answer:
            </h4>
            <NumericalInput
              value={numericalAnswer ?? null}
              onChange={(val) => onNumericalAnswer?.(val)}
            />
          </div>
        )}

        {/* UNTOUCHED: Action buttons */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button
            variant={isMarkedForReview ? 'default' : 'outline'}
            onClick={onMarkForReview}
            className="flex items-center gap-2"
          >
            <Flag className="w-4 h-4" />
            {isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
          </Button>

          {(selectedOption || numericalAnswer !== null && numericalAnswer !== undefined) && (
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