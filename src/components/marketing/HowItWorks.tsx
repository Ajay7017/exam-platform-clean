'use client'

import { useEffect, useState, useRef } from 'react'
import { 
  UserPlus, 
  FileSearch, 
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Play,
  Rocket
} from 'lucide-react'

interface Step {
  icon: React.ReactNode
  step: string
  title: string
  description: string
  features: string[]
  color: string
  gradient: string
}

const steps: Step[] = [
  {
    icon: <UserPlus className="w-8 h-8" />,
    step: 'Step 1',
    title: 'Create Account',
    description: 'Sign up in seconds with Google or email. No credit card required for free practice',
    features: [
      'Quick Google sign-in',
      'Instant access',
      'No payment needed'
    ],
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    icon: <FileSearch className="w-8 h-8" />,
    step: 'Step 2',
    title: 'Choose Your Exam',
    description: 'Browse through 450+ exams across GATE, SSC, JEE, NEET, UPSC, and more',
    features: [
      '450+ exam options',
      'Multiple categories',
      'Difficulty levels'
    ],
    color: 'text-purple-600',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    icon: <TrendingUp className="w-8 h-8" />,
    step: 'Step 3',
    title: 'Practice & Improve',
    description: 'Take tests, analyze results, and track your progress with detailed analytics',
    features: [
      'Real-time analytics',
      'Performance tracking',
      'Personalized insights'
    ],
    color: 'text-green-600',
    gradient: 'from-green-500 to-emerald-500'
  }
]

// Individual step card
function StepCard({ step, index, isVisible }: { step: Step; index: number; isVisible: boolean }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      className={`step-card ${isVisible ? 'animate-slide-in-up' : 'opacity-0'}`}
      style={{
        animationDelay: `${index * 200}ms`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Connection line to next step (hidden on last step and mobile) */}
      {index < steps.length - 1 && (
        <div className="hidden lg:block absolute top-24 left-full w-full h-0.5 z-0">
          <div className={`h-full bg-gradient-to-r ${step.gradient} opacity-30`}>
            <div 
              className={`h-full bg-gradient-to-r ${step.gradient} transition-all duration-1000 ${isVisible ? 'w-full' : 'w-0'}`}
              style={{
                transitionDelay: `${index * 200 + 400}ms`
              }}
            />
          </div>
          {/* Animated dot traveling along line */}
          {isVisible && (
            <div 
              className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gradient-to-r ${step.gradient} shadow-lg animate-travel-line`}
              style={{
                animationDelay: `${index * 200 + 400}ms`
              }}
            />
          )}
        </div>
      )}

      {/* Step Card */}
      <div className="relative z-10">
        {/* Glow effect */}
        <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-20 blur-2xl transition-all duration-500 rounded-3xl ${isHovered ? 'scale-110' : 'scale-100'}`} />

        {/* Card container */}
        <div className="relative bg-white dark:bg-gray-900 rounded-3xl border-2 border-gray-200 dark:border-gray-800 hover:border-transparent p-8 lg:p-10 space-y-6 transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:-translate-y-3 group overflow-hidden">
          
          {/* Background pattern */}
          <div 
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
            style={{
              backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
              backgroundSize: '20px 20px'
            }}
          />

          {/* Step number badge */}
          <div className="flex items-center justify-between mb-4">
            <span className={`inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r ${step.gradient} text-white text-sm font-bold shadow-lg`}>
              {step.step}
            </span>
            <ArrowRight className={`w-6 h-6 text-gray-400 dark:text-gray-600 transition-all duration-300 ${isHovered ? 'translate-x-2 text-blue-600 dark:text-blue-400' : ''}`} />
          </div>

          {/* Icon with animated background */}
          <div className="relative inline-block">
            {/* Pulsing ring */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.gradient} opacity-20 animate-ping`} />
            
            {/* Rotating border */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.gradient} opacity-50 ${isHovered ? 'animate-spin-slow' : ''}`} 
              style={{ padding: '3px' }}
            />
            
            {/* Icon container */}
            <div className={`relative w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white shadow-xl group-hover:shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6`}>
              {step.icon}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Title */}
            <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
              {step.title}
            </h3>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-base lg:text-lg">
              {step.description}
            </p>

            {/* Features list */}
            <div className="space-y-3 pt-4">
              {step.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 text-sm lg:text-base group/item"
                  style={{
                    animation: isVisible ? 'slide-in-right 0.5s ease-out forwards' : 'none',
                    animationDelay: `${index * 200 + idx * 100 + 600}ms`,
                    opacity: isVisible ? 1 : 0
                  }}
                >
                  <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${step.color} group-hover/item:scale-125 transition-transform`} />
                  <span className="text-gray-700 dark:text-gray-300 font-medium group-hover/item:text-gray-900 dark:group-hover/item:text-white transition-colors">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-500/5 to-pink-500/5 rounded-tr-full" />

          {/* Hover overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-3xl`} />
        </div>
      </div>
    </div>
  )
}

export function HowItWorks() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  // Intersection Observer
  useEffect(() => {
    if (typeof window === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true)
          }
        })
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [isVisible])

  return (
    <section 
      ref={sectionRef}
      className="relative py-20 md:py-8 bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 overflow-hidden"
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse animation-delay-2000" />
        
        {/* Grid lines */}
        <div 
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #6366f1 1px, transparent 1px),
              linear-gradient(to bottom, #6366f1 1px, transparent 1px)
            `,
            backgroundSize: '4rem 4rem'
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section header */}
        <div className="text-center space-y-6 mb-16 md:mb-8">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-800 shadow-lg">
            <Play className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
              Simple Process
            </span>
          </div>

          {/* Main heading */}
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight">
              How It{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient-x">
                Works
              </span>
            </h2>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Get started in three simple steps and begin your journey to success
            </p>
          </div>

          {/* Stats line */}
          <div className="flex flex-wrap justify-center gap-6 pt-4">
            {[
              { icon: <Sparkles className="w-4 h-4" />, text: '2 minutes setup' },
              { icon: <Rocket className="w-4 h-4" />, text: 'Start immediately' },
              { icon: <CheckCircle2 className="w-4 h-4" />, text: 'No credit card' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="text-green-600 dark:text-green-400">
                  {item.icon}
                </div>
                <span className="font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Steps timeline */}
        <div className="relative">
          
          {/* Desktop connecting line (background) */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-800" />

          {/* Steps grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12 relative">
            {steps.map((step, index) => (
              <StepCard
                key={index}
                step={step}
                index={index}
                isVisible={isVisible}
              />
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 text-center space-y-6">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Ready to get started? Join thousands of successful students today!
          </p>
          
          <button className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold text-lg shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 overflow-hidden">
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            <span className="relative">Start Your Free Trial</span>
            <Rocket className="relative w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            No credit card required • Cancel anytime • 450+ exams available
          </p>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes slide-in-up {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes travel-line {
          0% {
            left: 0;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            left: 100%;
            opacity: 0;
          }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .step-card {
          position: relative;
        }

        .animate-slide-in-up {
          animation: slide-in-up 0.8s ease-out forwards;
        }

        .animate-travel-line {
          animation: travel-line 2s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </section>
  )
}