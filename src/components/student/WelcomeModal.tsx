// src/components/student/WelcomeModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

interface WelcomeModalProps {
  userName: string
  userId:   string
}

const STEPS = [
  {
    emoji:       '🎯',
    gradient:    'from-violet-500 via-purple-500 to-indigo-600',
    bgGlow:      'bg-violet-500',
    title:       'Your Exam Platform',
    subtitle:    'Everything you need to ace your exams — in one place.',
    description: 'Mockzy gives you real exam simulations, detailed analytics, and a leaderboard to track where you stand. Let\'s show you around.',
    visual:      'hero',
  },
  {
    emoji:       '📚',
    gradient:    'from-blue-500 via-cyan-500 to-teal-500',
    bgGlow:      'bg-blue-500',
    title:       'Browse & Attempt Exams',
    subtitle:    'Hundreds of exams across subjects.',
    description: 'Filter by subject, difficulty, or category. Each exam is timed, auto-graded, and gives you instant results with detailed solutions.',
    visual:      'exams',
  },
  {
    emoji:       '📊',
    gradient:    'from-emerald-500 via-green-500 to-teal-600',
    bgGlow:      'bg-emerald-500',
    title:       'Track Your Progress',
    subtitle:    'Know exactly where you stand.',
    description: 'After every exam, see your score, rank, accuracy, and topic-wise performance. Compare yourself against toppers and the average.',
    visual:      'results',
  },
  {
    emoji:       '🏆',
    gradient:    'from-amber-500 via-orange-500 to-red-500',
    bgGlow:      'bg-amber-500',
    title:       'Compete & Climb',
    subtitle:    'Rise through the leaderboard.',
    description: 'Every official attempt counts toward your rank. Check the leaderboard by subject, exam, or all-time. Your journey to the top starts now.',
    visual:      'leaderboard',
  },
]

// Animated visual for each step
function StepVisual({ visual, gradient }: { visual: string; gradient: string }) {
  if (visual === 'hero') {
    return (
      <div className="relative w-full h-36 flex items-center justify-center">
        {/* Orbiting dots */}
        <div className="absolute inset-0 flex items-center justify-center">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-white/40"
              style={{
                transform: `rotate(${i * 60}deg) translateX(56px)`,
                animation: `spin 8s linear infinite`,
                animationDelay: `${i * -1.3}s`,
              }}
            />
          ))}
        </div>
        {/* Center icon */}
        <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-2xl`}
          style={{ animation: 'float 3s ease-in-out infinite' }}>
          <span className="text-4xl">🎓</span>
        </div>
        {/* Floating badges */}
        <div className="absolute top-2 right-8 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-lg"
          style={{ animation: 'float 3s ease-in-out infinite', animationDelay: '-1s' }}>
          <p className="text-xs font-bold text-gray-800">+47 points 🔥</p>
        </div>
        <div className="absolute bottom-2 left-8 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-lg"
          style={{ animation: 'float 3s ease-in-out infinite', animationDelay: '-2s' }}>
          <p className="text-xs font-bold text-gray-800">Rank #1 🏆</p>
        </div>
      </div>
    )
  }

  if (visual === 'exams') {
    return (
      <div className="relative w-full h-36 flex items-center justify-center gap-3">
        {[
          { label: 'Physics', q: '42 Q', color: 'from-blue-400 to-blue-600', delay: '0s' },
          { label: 'Chemistry', q: '38 Q', color: 'from-cyan-400 to-teal-600', delay: '0.15s' },
          { label: 'Biology', q: '50 Q', color: 'from-emerald-400 to-green-600', delay: '0.3s' },
        ].map((card) => (
          <div
            key={card.label}
            className={`bg-gradient-to-br ${card.color} rounded-2xl p-3 w-24 shadow-xl flex flex-col items-center gap-1`}
            style={{ animation: 'float 3s ease-in-out infinite', animationDelay: card.delay }}
          >
            <span className="text-2xl">📖</span>
            <p className="text-white text-xs font-bold">{card.label}</p>
            <p className="text-white/70 text-[10px]">{card.q}</p>
          </div>
        ))}
      </div>
    )
  }

  if (visual === 'results') {
    return (
      <div className="relative w-full h-36 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 w-64 border border-white/20 shadow-xl"
          style={{ animation: 'float 3s ease-in-out infinite' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-white text-sm font-bold">Your Score</p>
            <span className="bg-emerald-400/30 text-emerald-300 text-xs px-2 py-0.5 rounded-full font-bold">Excellent</span>
          </div>
          <div className="flex items-baseline gap-1 mb-3">
            <p className="text-white text-4xl font-black">87</p>
            <p className="text-white/50 text-lg">/100</p>
          </div>
          {/* Mini bar chart */}
          <div className="flex items-end gap-1 h-8">
            {[40, 65, 55, 80, 70, 87].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-white/30"
                style={{
                  height: `${h}%`,
                  animation: 'growUp 0.6s ease-out forwards',
                  animationDelay: `${i * 0.1}s`,
                  transform: 'scaleY(0)',
                  transformOrigin: 'bottom',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (visual === 'leaderboard') {
    return (
      <div className="relative w-full h-36 flex items-center justify-center">
        <div className="space-y-2 w-64">
          {[
            { rank: 1, name: 'You 🎉', score: '94%', medal: '🥇', highlight: true },
            { rank: 2, name: 'Priya S.', score: '88%', medal: '🥈', highlight: false },
            { rank: 3, name: 'Rohan K.', score: '82%', medal: '🥉', highlight: false },
          ].map((item, i) => (
            <div
              key={item.rank}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                item.highlight
                  ? 'bg-white/20 border border-white/30 backdrop-blur-sm'
                  : 'bg-white/8'
              }`}
              style={{ animation: 'slideInRight 0.4s ease-out forwards', animationDelay: `${i * 0.1}s`, opacity: 0 }}
            >
              <span className="text-lg">{item.medal}</span>
              <p className={`flex-1 text-sm font-semibold ${item.highlight ? 'text-white' : 'text-white/70'}`}>
                {item.name}
              </p>
              <p className={`text-sm font-bold ${item.highlight ? 'text-white' : 'text-white/50'}`}>
                {item.score}
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

export function WelcomeModal({ userName, userId }: WelcomeModalProps) {
  const router                    = useRouter()
  const [visible,   setVisible]   = useState(false)
  const [step,      setStep]      = useState(0)
  const [animating, setAnimating] = useState(false)
  const [leaving,   setLeaving]   = useState(false)

  useEffect(() => {
    console.log('🎯 WelcomeModal useEffect fired, userId:', userId)
    if (!userId) return
    const key = `welcome_shown_${userId}`
    const existing = localStorage.getItem(key)
    console.log('🎯 existing key:', existing)
    if (!existing) {
      console.log('🎯 Setting visible in 600ms...')
      const t = setTimeout(() => {
        console.log('🎯 setVisible(true) called!')
        setVisible(true)
      }, 600)
      return () => clearTimeout(t)
    }
  }, [userId])

  const markSeen = () => {
    localStorage.setItem(`welcome_shown_${userId}`, '1')
  }

  const handleNext = () => {
    if (animating) return
    if (step < STEPS.length - 1) {
      setAnimating(true)
      setTimeout(() => {
        setStep(s => s + 1)
        setAnimating(false)
      }, 200)
    } else {
      handleDismiss()
    }
  }

  const handleDismiss = () => {
    markSeen()
    setLeaving(true)
    setTimeout(() => setVisible(false), 400)
  }

  const handleBrowseExams = () => {
    markSeen()
    setLeaving(true)
    setTimeout(() => {
      setVisible(false)
      router.push('/exams')
    }, 300)
  }

  if (!visible) return null

  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes spin {
          from { transform: rotate(var(--start-angle, 0deg)) translateX(56px); }
          to   { transform: rotate(calc(var(--start-angle, 0deg) + 360deg)) translateX(56px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeOutScale {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(0.95); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes growUp {
          from { transform: scaleY(0); }
          to   { transform: scaleY(1); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .modal-enter { animation: fadeInScale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .modal-leave { animation: fadeOutScale 0.3s ease-in forwards; }
        .step-enter  { animation: fadeInUp 0.3s ease-out forwards; }
        .shimmer-text {
          background: linear-gradient(90deg, #fff 0%, #fff8 40%, #fff 60%, #fff8 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          animation: leaving ? 'fadeOutScale 0.3s ease-in forwards' : 'fadeInScale 0.3s ease-out forwards',
        }}
        onClick={handleDismiss}
      >
        {/* Modal */}
        <div
          className={`relative w-full max-w-md overflow-hidden rounded-3xl shadow-2xl ${leaving ? 'modal-leave' : 'modal-enter'}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Gradient background */}
          <div className={`absolute inset-0 bg-gradient-to-br ${current.gradient} transition-all duration-500`} />

          {/* Noise texture overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Glow orbs */}
          <div className={`absolute -top-16 -right-16 w-48 h-48 ${current.bgGlow} rounded-full opacity-30 blur-3xl`} />
          <div className={`absolute -bottom-16 -left-16 w-48 h-48 ${current.bgGlow} rounded-full opacity-20 blur-3xl`} />

          {/* Content */}
          <div className="relative z-10 p-7">

            {/* Top row */}
            <div className="flex items-center justify-between mb-6">
              {/* Step dots */}
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => !animating && setStep(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === step
                        ? 'w-6 h-2 bg-white'
                        : i < step
                        ? 'w-2 h-2 bg-white/60'
                        : 'w-2 h-2 bg-white/25'
                    }`}
                  />
                ))}
              </div>

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Visual area */}
            <div
              key={step}
              className="step-enter mb-6"
            >
              <StepVisual visual={current.visual} gradient={current.gradient} />
            </div>

            {/* Text content */}
            <div key={`text-${step}`} className="step-enter">
              {step === 0 && (
                <p className="text-white/70 text-sm font-medium mb-1">
                  Hey {userName?.split(' ')[0] || 'there'} 👋
                </p>
              )}
              <h2 className="text-white text-2xl font-black leading-tight mb-2">
                {current.title}
              </h2>
              <p className="text-white font-semibold text-sm mb-1">
                {current.subtitle}
              </p>
              <p className="text-white/70 text-sm leading-relaxed">
                {current.description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6">
              {isLast ? (
                <>
                  <button
                    onClick={handleBrowseExams}
                    className="flex-1 bg-white text-gray-900 font-bold text-sm py-3 rounded-2xl hover:bg-white/90 transition-all shadow-lg active:scale-95"
                  >
                    Browse Exams →
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-colors"
                  >
                    Dashboard
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleNext}
                    disabled={animating}
                    className="flex-1 bg-white text-gray-900 font-bold text-sm py-3 rounded-2xl hover:bg-white/90 transition-all shadow-lg active:scale-95 disabled:opacity-70"
                  >
                    {step === 0 ? `Let's go →` : 'Next →'}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-colors"
                  >
                    Skip
                  </button>
                </>
              )}
            </div>

            {/* Step counter */}
            <p className="text-center text-white/40 text-xs mt-4">
              {step + 1} of {STEPS.length}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}