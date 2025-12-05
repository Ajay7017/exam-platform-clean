'use client'

import { useEffect, useState, useRef } from 'react'
import { Users, FileText, Trophy, Clock, Target, BookOpen, Award, TrendingUp } from 'lucide-react'

interface Stat {
  icon: React.ReactNode
  label: string
  value: number
  suffix: string
  prefix?: string
  color: string
  gradient: string
}

const stats: Stat[] = [
  {
    icon: <Users className="w-8 h-8" />,
    label: 'Active Students',
    value: 50000,
    suffix: '+',
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    icon: <FileText className="w-8 h-8" />,
    label: 'Practice Questions',
    value: 200000,
    suffix: '+',
    color: 'text-purple-600',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    icon: <Trophy className="w-8 h-8" />,
    label: 'Exams Completed',
    value: 125000,
    suffix: '+',
    color: 'text-yellow-600',
    gradient: 'from-yellow-500 to-orange-500'
  },
  {
    icon: <Target className="w-8 h-8" />,
    label: 'Success Rate',
    value: 98,
    suffix: '%',
    color: 'text-green-600',
    gradient: 'from-green-500 to-emerald-500'
  }
]

// Animated counter hook
function useAnimatedCounter(end: number, duration: number = 2000, startCounting: boolean = false) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!startCounting) return

    let startTime: number | null = null
    let animationFrame: number

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)

      // Easing function for smooth animation (easeOutExpo)
      const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      
      setCount(Math.floor(end * easeOutExpo))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      } else {
        setCount(end)
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationFrame)
  }, [end, duration, startCounting])

  return count
}

// Individual stat card component
function StatCard({ stat, index, isVisible }: { stat: Stat; index: number; isVisible: boolean }) {
  const count = useAnimatedCounter(stat.value, 2000, isVisible)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="group relative"
      style={{
        animationDelay: `${index * 100}ms`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background glow effect */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 blur-xl transition-all duration-500 rounded-2xl`}
      />

      {/* Card content */}
      <div className="relative flex flex-col items-center text-center space-y-4 p-6 md:p-8 rounded-2xl border-2 border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm hover:border-transparent hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2">
        
        {/* Icon with animated background */}
        <div className="relative">
          {/* Rotating gradient border */}
          <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} rounded-2xl blur-md opacity-50 group-hover:opacity-100 transition-opacity duration-500 ${isHovered ? 'animate-spin-slow' : ''}`} />
          
          {/* Icon container */}
          <div className={`relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white shadow-lg group-hover:shadow-2xl transition-all duration-500 group-hover:scale-110`}>
            {stat.icon}
          </div>

          {/* Pulse ring */}
          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.gradient} opacity-75 group-hover:animate-ping`} />
        </div>

        {/* Counter */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-center gap-1">
            {stat.prefix && (
              <span className={`text-3xl md:text-4xl font-bold ${stat.color} dark:text-white`}>
                {stat.prefix}
              </span>
            )}
            <span className={`text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent tabular-nums`}>
              {count.toLocaleString()}
            </span>
            <span className={`text-3xl md:text-4xl font-bold ${stat.color} dark:text-white`}>
              {stat.suffix}
            </span>
          </div>

          {/* Label */}
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-semibold">
            {stat.label}
          </p>
        </div>

        {/* Decorative dots */}
        <div className="flex gap-1.5">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${stat.gradient} opacity-50 group-hover:opacity-100 transition-opacity duration-300`}
              style={{ transitionDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function StatsBar() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  // Intersection Observer to trigger animation when section is visible
  useEffect(() => {
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
      className="relative py-16 md:py-24 bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden"
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Grid pattern */}
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

        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse animation-delay-2000" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section header */}
        <div className="text-center space-y-4 mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-800">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
              Trusted by Thousands
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
            Our Impact in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Numbers
            </span>
          </h2>
          
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Join thousands of successful students who achieved their dreams with ExamPro
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              stat={stat}
              index={index}
              isVisible={isVisible}
            />
          ))}
        </div>

        {/* Bottom decorative line */}
        <div className="mt-16 md:mt-20 flex justify-center">
          <div className="h-1 w-32 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full" />
        </div>

        {/* Additional mini stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { icon: <BookOpen className="w-5 h-5" />, label: '450+ Exams', color: 'from-blue-500 to-cyan-500' },
            { icon: <Award className="w-5 h-5" />, label: 'Top Ranked', color: 'from-purple-500 to-pink-500' },
            { icon: <Clock className="w-5 h-5" />, label: '24/7 Support', color: 'from-orange-500 to-red-500' },
            { icon: <Target className="w-5 h-5" />, label: 'AI Analytics', color: 'from-green-500 to-emerald-500' }
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:border-transparent hover:shadow-lg transition-all duration-300 hover:scale-105 group"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                {item.icon}
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .tabular-nums {
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </section>
  )
}