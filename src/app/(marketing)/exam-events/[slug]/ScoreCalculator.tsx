'use client'

import { useState } from 'react'
import { Calculator, RotateCcw } from 'lucide-react'

interface Props {
  totalQuestions: number
  totalMarks: number
  correctMarks: number
  negativeMarks: number
  cutoffGeneral: number | null
  cutoffOBC: number | null
  cutoffSC: number | null
  cutoffST: number | null
}

export function ScoreCalculator({
  totalQuestions,
  totalMarks,
  correctMarks,
  negativeMarks,
  cutoffGeneral,
  cutoffOBC,
  cutoffSC,
  cutoffST,
}: Props) {
  const [correct, setCorrect] = useState('')
  const [incorrect, setIncorrect] = useState('')

  const correctNum = parseInt(correct) || 0
  const incorrectNum = parseInt(incorrect) || 0
  const attempted = correctNum + incorrectNum
  const unattempted = totalQuestions - attempted

  const score = (correctNum * correctMarks) - (incorrectNum * negativeMarks)
  const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0
  const hasResult = correct !== '' || incorrect !== ''

  const cutoffs = [
    { label: 'General', value: cutoffGeneral },
    { label: 'OBC', value: cutoffOBC },
    { label: 'SC', value: cutoffSC },
    { label: 'ST', value: cutoffST },
  ].filter(c => c.value !== null)

  const handleReset = () => {
    setCorrect('')
    setIncorrect('')
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-500" />
            Score Calculator
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            +{correctMarks} correct · -{negativeMarks} incorrect · {totalQuestions} questions · {totalMarks} marks
          </p>
        </div>
        {hasResult && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ✅ Correct Answers
            </label>
            <input
              type="number"
              value={correct}
              onChange={e => setCorrect(e.target.value)}
              min={0}
              max={totalQuestions}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ❌ Incorrect Answers
            </label>
            <input
              type="number"
              value={incorrect}
              onChange={e => setIncorrect(e.target.value)}
              min={0}
              max={totalQuestions}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="0"
            />
          </div>
        </div>

        {/* Result */}
        {hasResult && (
          <div className="space-y-4 animate-in fade-in duration-300">

            {/* Score banner */}
            <div className={`rounded-xl p-5 text-center ${
              score >= (cutoffGeneral || 0)
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className="text-sm text-gray-500 mb-1">Your Estimated Score</p>
              <p className={`text-5xl font-bold ${
                score >= (cutoffGeneral || 0) ? 'text-green-600' : 'text-red-500'
              }`}>
                {score < 0 ? score.toFixed(0) : Math.max(0, score).toFixed(0)}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                out of {totalMarks} ({percentage < 0 ? 0 : percentage.toFixed(1)}%)
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Attempted', value: attempted, color: 'text-blue-600' },
                { label: 'Unattempted', value: unattempted < 0 ? 0 : unattempted, color: 'text-gray-500' },
                { label: 'Percentage', value: `${percentage < 0 ? '0.0' : percentage.toFixed(1)}%`, color: 'text-violet-600' },
              ].map(stat => (
                <div key={stat.label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Cutoff comparison */}
            {cutoffs.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Expected Cutoff Comparison
                </p>
                <div className="space-y-2">
                  {cutoffs.map(({ label, value }) => {
                    const myScore = Math.max(0, score)
                    const passes = myScore >= value!
                    return (
                      <div key={label} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">Cutoff: {value}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            passes
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {passes ? '✓ Qualify' : '✗ Below'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 text-center">
              * This is an estimated score. Official results may vary.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}