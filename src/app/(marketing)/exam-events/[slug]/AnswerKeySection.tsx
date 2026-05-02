'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'

interface Section {
  name: string
  from: number
  to: number
}

interface Question {
  number: number
  answer: string
  explanation: string
}

interface AnswerKey {
  sections: Section[]
  questions: Question[]
}

// ── Explanation Renderer ───────────────────────────────────────────────────
// Renders rich text HTML from the editor including KaTeX math
function ExplanationRenderer({ html }: { html: string }) {
  return (
    <div
      className="prose prose-sm max-w-none text-gray-700
        prose-p:my-1 prose-p:leading-relaxed
        prose-strong:text-gray-900
        prose-em:text-gray-700"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// ── Answer Badge ───────────────────────────────────────────────────────────
function AnswerBadge({ answer }: { answer: string }) {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white text-sm font-bold shrink-0">
      {answer}
    </span>
  )
}

// ── Question Row ───────────────────────────────────────────────────────────
function QuestionRow({ question }: { question: Question }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasExplanation = !!question.explanation

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Question number */}
        <span className="text-xs font-mono text-gray-400 w-10 shrink-0">
          Q.{question.number}
        </span>

        {/* Answer */}
        <AnswerBadge answer={question.answer} />

        <div className="flex-1" />

        {/* Explanation toggle */}
        {hasExplanation && (
          <button
            onClick={() => setIsExpanded(e => !e)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            {isExpanded ? (
              <>Hide Explanation <ChevronUp className="w-3.5 h-3.5" /></>
            ) : (
              <>View Explanation <ChevronDown className="w-3.5 h-3.5" /></>
            )}
          </button>
        )}
      </div>

      {/* Explanation accordion */}
      {isExpanded && hasExplanation && (
        <div className="border-t border-gray-100 px-4 py-3 bg-blue-50/40">
          <p className="text-xs font-medium text-blue-600 mb-2">Explanation</p>
          <ExplanationRenderer html={question.explanation} />
        </div>
      )}
    </div>
  )
}

// ── Main Export ────────────────────────────────────────────────────────────
export function AnswerKeySection({ answerKey }: { answerKey: AnswerKey | null }) {
  const [activeSection, setActiveSection] = useState(0)
  const [search, setSearch] = useState('')

  // Don't render if no answer key
  if (!answerKey || answerKey.questions.length === 0) return null

  const currentSection = answerKey.sections[activeSection]

  const filteredQuestions = useMemo(() => {
    let questions = answerKey.questions

    // Filter by active section
    if (currentSection) {
      questions = questions.filter(
        q => q.number >= currentSection.from && q.number <= currentSection.to
      )
    }

    // Filter by search
    if (search.trim()) {
      const num = parseInt(search.trim())
      if (!isNaN(num)) {
        questions = questions.filter(q => q.number === num)
      }
    }

    return questions
  }, [answerKey.questions, currentSection, search])

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Answer Key</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {answerKey.questions.length} answers — click "View Explanation" for detailed solutions
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="number"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by question number..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Section tabs */}
        {answerKey.sections.length > 1 && !search && (
          <div className="flex gap-2 flex-wrap">
            {answerKey.sections.map((section, index) => (
              <button
                key={index}
                onClick={() => setActiveSection(index)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === index
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {section.name}
                <span className={`ml-1.5 text-xs ${
                  activeSection === index ? 'text-blue-200' : 'text-gray-400'
                }`}>
                  ({section.to - section.from + 1})
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Questions list */}
        {filteredQuestions.length > 0 ? (
          <div className="space-y-1.5">
            {filteredQuestions.map(question => (
              <QuestionRow key={question.number} question={question} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">
              {search
                ? `No question found for Q.${search}`
                : 'No answers in this section yet'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}