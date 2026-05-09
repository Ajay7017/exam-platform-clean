// src/components/exam/PracticeQuestion.tsx
'use client'

import { useState } from 'react'
import { SafeHtml } from '@/lib/utils/safe-html'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Lightbulb } from 'lucide-react'

interface PracticeOption {
  id: string
  text: string
  optionKey: string
  isCorrect: boolean
  imageUrl: string | null
}

interface PracticeQuestionProps {
  question: {
    id: string
    statement: string
    imageUrl: string | null
    explanation: string | null
    type: string
    options: PracticeOption[]
  }
  questionNumber: number
  onAnswered: () => void // called once when user checks — lets parent track progress
}

export function PracticeQuestion({
  question,
  questionNumber,
  onAnswered,
}: PracticeQuestionProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [isChecked, setIsChecked] = useState(false)

  const handleCheck = () => {
    if (!selectedKey || isChecked) return
    setIsChecked(true)
    onAnswered()
  }

  const getOptionStyle = (option: PracticeOption) => {
    if (!isChecked) {
      // Before check — highlight selected only
      return selectedKey === option.optionKey
        ? 'border-primary bg-primary/5'
        : 'border-border hover:bg-muted/50 cursor-pointer'
    }
    // After check — colour-code all relevant options
    if (option.isCorrect) {
      return 'border-green-500 bg-green-50 dark:bg-green-950/30'
    }
    if (selectedKey === option.optionKey && !option.isCorrect) {
      return 'border-red-500 bg-red-50 dark:bg-red-950/30'
    }
    return 'border-border opacity-50'
  }

  const getOptionIcon = (option: PracticeOption) => {
    if (!isChecked) return null
    if (option.isCorrect) {
      return <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
    }
    if (selectedKey === option.optionKey && !option.isCorrect) {
      return <XCircle className="w-5 h-5 text-red-500 shrink-0" />
    }
    return null
  }

  const isCorrectAnswer = isChecked && question.options.find(o => o.optionKey === selectedKey)?.isCorrect

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">

      {/* Question header */}
      <div className="flex items-start gap-3">
        <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-sm font-bold">
          {questionNumber}
        </span>
        <div className="flex-1 text-base leading-relaxed text-gray-900 dark:text-white">
          <SafeHtml html={question.statement} />
        </div>
      </div>

      {/* Question image (if any) */}
      {question.imageUrl && (
        <div className="ml-11">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={question.imageUrl}
            alt={`Question ${questionNumber} image`}
            className="max-h-64 rounded-lg border border-gray-200 dark:border-gray-700 object-contain"
          />
        </div>
      )}

      {/* Options */}
      <div className="ml-11 space-y-2.5">
        {question.options.map((option) => (
          <div
            key={option.id}
            onClick={() => !isChecked && setSelectedKey(option.optionKey)}
            className={`flex items-center gap-3 p-3.5 rounded-lg border-2 transition-all duration-200 select-none ${getOptionStyle(option)} ${
              isChecked ? 'cursor-default' : ''
            }`}
          >
            {/* Option key pill */}
            <span
              className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                !isChecked && selectedKey === option.optionKey
                  ? 'bg-primary text-primary-foreground'
                  : isChecked && option.isCorrect
                  ? 'bg-green-500 text-white'
                  : isChecked && selectedKey === option.optionKey && !option.isCorrect
                  ? 'bg-red-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {option.optionKey}
            </span>

            <div className="flex-1 text-sm leading-relaxed">
              <SafeHtml html={option.text} className="inline" />
              {option.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={option.imageUrl}
                  alt=""
                  className="mt-2 max-h-24 rounded object-contain"
                />
              )}
            </div>

            {/* Result icon — right side */}
            {getOptionIcon(option)}
          </div>
        ))}
      </div>

      {/* Check Answer button + result feedback */}
      <div className="ml-11 space-y-3">
        {!isChecked ? (
          <Button
            onClick={handleCheck}
            disabled={!selectedKey}
            className="w-full sm:w-auto"
          >
            Check Answer
          </Button>
        ) : (
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
              isCorrectAnswer
                ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'
            }`}
          >
            {isCorrectAnswer ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Correct!
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Incorrect
              </>
            )}
          </div>
        )}

        {/* Explanation — only shown after check */}
        {isChecked && question.explanation && (
          <div className="flex gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
              <SafeHtml html={question.explanation} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}