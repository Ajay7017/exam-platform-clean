'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { 
  Zap,
  Users,
  Clock,
  Trophy,
  TrendingUp,
  Star,
  BookOpen,
  Brain,
  Microscope,
  Calculator,
  FlaskConical,
  Atom,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Crown,
  Target,
  Award
} from 'lucide-react'

interface Exam {
  id: string
  name: string
  fullName: string
  icon: React.ReactNode
  category: 'engineering' | 'medical'
  gradient: string
  color: string
  stats: {
    students: string
    questions: string
    duration: string
    difficulty: 'Easy' | 'Medium' | 'Hard'
  }
  features: string[]
  subjects: string[]
  rating: number
  popular: boolean
  trending: boolean
}

const exams: Exam[] = [
  {
    id: 'jee-main',
    name: 'JEE Main',
    fullName: 'Joint Entrance Examination - Main Exam',
    icon: <Calculator className="w-8 h-8" />,
    category: 'engineering',
    gradient: 'from-blue-500 via-cyan-500 to-teal-500',
    color: 'text-blue-600',
    stats: {
      students: '12.5K+',
      questions: '25,000+',
      duration: '3 Hours',
      difficulty: 'Hard'
    },
    features: [
      'Full-length mock tests',
      'Chapter-wise practice',
      'Previous year papers',
      'Video solutions'
    ],
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    rating: 4.8,
    popular: true,
    trending: true
  },
  {
    id: 'jee-advanced',
    name: 'JEE Advanced',
    fullName: 'Joint Entrance Examination - Advanced',
    icon: <Brain className="w-8 h-8" />,
    category: 'engineering',
    gradient: 'from-purple-500 via-indigo-500 to-blue-500',
    color: 'text-purple-600',
    stats: {
      students: '8.2K+',
      questions: '18,000+',
      duration: '3 Hours',
      difficulty: 'Hard'
    },
    features: [
      'IIT-level questions',
      'Detailed analytics',
      'Expert solutions',
      'Rank predictor'
    ],
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    rating: 4.9,
    popular: true,
    trending: false
  },
  {
    id: 'neet-ug',
    name: 'NEET UG',
    fullName: 'National Eligibility cum Entrance Test',
    icon: <Microscope className="w-8 h-8" />,
    category: 'medical',
    gradient: 'from-green-500 via-emerald-500 to-teal-500',
    color: 'text-green-600',
    stats: {
      students: '15.8K+',
      questions: '30,000+',
      duration: '3 Hours',
      difficulty: 'Hard'
    },
    features: [
      'NCERT-focused',
      'Biology emphasis',
      'Medical MCQs',
      'All India rank'
    ],
    subjects: ['Physics', 'Chemistry', 'Biology'],
    rating: 4.9,
    popular: true,
    trending: true
  },
  {
    id: 'neet-pg',
    name: 'NEET PG',
    fullName: 'National Eligibility cum Entrance Test - PG',
    icon: <FlaskConical className="w-8 h-8" />,
    category: 'medical',
    gradient: 'from-pink-500 via-rose-500 to-red-500',
    color: 'text-pink-600',
    stats: {
      students: '5.3K+',
      questions: '15,000+',
      duration: '3.5 Hours',
      difficulty: 'Hard'
    },
    features: [
      'Clinical cases',
      'Subject-wise tests',
      'Image-based MCQs',
      'Performance tracking'
    ],
    subjects: ['Medicine', 'Surgery', 'Pathology', 'Radiology'],
    rating: 4.7,
    popular: false,
    trending: false
  },
  {
    id: 'bitsat',
    name: 'BITSAT',
    fullName: 'Birla Institute of Technology and Science',
    icon: <Atom className="w-8 h-8" />,
    category: 'engineering',
    gradient: 'from-orange-500 via-amber-500 to-yellow-500',
    color: 'text-orange-600',
    stats: {
      students: '4.7K+',
      questions: '12,000+',
      duration: '3 Hours',
      difficulty: 'Medium'
    },
    features: [
      'Computer-based test',
      'English & Logical',
      'Instant scoring',
      'Adaptive practice'
    ],
    subjects: ['Physics', 'Chemistry', 'Maths/Bio', 'English'],
    rating: 4.6,
    popular: false,
    trending: true
  },
  {
    id: 'aiims',
    name: 'AIIMS',
    fullName: 'All India Institute of Medical Sciences',
    icon: <Award className="w-8 h-8" />,
    category: 'medical',
    gradient: 'from-indigo-500 via-violet-500 to-purple-500',
    color: 'text-indigo-600',
    stats: {
      students: '6.1K+',
      questions: '20,000+',
      duration: '3.5 Hours',
      difficulty: 'Hard'
    },
    features: [
      'AIIMS pattern',
      'Reasoning included',
      'Mock interviews',
      'Top college prep'
    ],
    subjects: ['Physics', 'Chemistry', 'Biology', 'Aptitude'],
    rating: 4.8,
    popular: true,
    trending: false
  }
]

// Difficulty badge component
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors = {
    Easy: 'from-green-500 to-emerald-500 text-white',
    Medium: 'from-yellow-500 to-orange-500 text-white',
    Hard: 'from-red-500 to-pink-500 text-white'
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${colors[difficulty as keyof typeof colors]} shadow-lg`}>
      {difficulty}
    </span>
  )
}

// Star rating component
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < Math.floor(rating)
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300 dark:text-gray-600'
          }`}
        />
      ))}
      <span className="ml-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
        {rating}
      </span>
    </div>
  )
}

// Exam card component
function ExamCard({ exam, index, isVisible }: { exam: Exam; index: number; isVisible: boolean }) {
  const [isHovered, setIsHovered] = useState(false)
  const [particlesActive, setParticlesActive] = useState(false)

  useEffect(() => {
    if (isHovered) {
      setParticlesActive(true)
      const timer = setTimeout(() => setParticlesActive(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [isHovered])

  return (
    <div
      className={`exam-card ${isVisible ? 'animate-card-entrance' : 'opacity-0'}`}
      style={{
        animationDelay: `${index * 150}ms`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-full group">
        
        {/* Glow effect */}
        <div className={`absolute -inset-1 bg-gradient-to-r ${exam.gradient} opacity-0 group-hover:opacity-75 blur-2xl transition-all duration-500 rounded-3xl ${isHovered ? 'animate-pulse-glow' : ''}`} />

        {/* Card container */}
        <div className="relative h-full bg-white dark:bg-gray-900 rounded-3xl border-2 border-gray-200 dark:border-gray-800 group-hover:border-transparent overflow-hidden transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-2">
          
          {/* Floating particles */}
          {particlesActive && (
            <>
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className={`absolute w-2 h-2 rounded-full bg-gradient-to-r ${exam.gradient} animate-particle-float`}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: `${2 + Math.random()}s`
                  }}
                />
              ))}
            </>
          )}

          {/* Header section */}
          <div className={`relative p-8 bg-gradient-to-br ${exam.gradient} overflow-hidden`}>
            
            {/* Pattern overlay */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                backgroundSize: '20px 20px'
              }}
            />

            {/* Badges row */}
            <div className="relative flex items-start justify-between mb-6">
              <div className="flex gap-2">
                {exam.popular && (
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-bold">
                    <Crown className="w-3 h-3" />
                    Popular
                  </span>
                )}
                {exam.trending && (
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-bold animate-pulse">
                    <TrendingUp className="w-3 h-3" />
                    Trending
                  </span>
                )}
              </div>
              
              <StarRating rating={exam.rating} />
            </div>

            {/* Icon and title */}
            <div className="relative flex items-center gap-4 mb-4">
              {/* Icon with rotating border */}
              <div className="relative">
                <div className={`absolute inset-0 rounded-2xl bg-white/30 ${isHovered ? 'animate-spin-slow' : ''}`} />
                <div className="relative w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  {exam.icon}
                </div>
              </div>

              {/* Title */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {exam.name}
                </h3>
                <p className="text-white/80 text-sm">
                  {exam.fullName}
                </p>
              </div>
            </div>

            {/* Subjects pills */}
            <div className="relative flex flex-wrap gap-2">
              {exam.subjects.map((subject, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium"
                >
                  {subject}
                </span>
              ))}
            </div>
          </div>

          {/* Body section */}
          <div className="p-8 space-y-6">
            
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 group-hover:bg-gradient-to-r group-hover:from-blue-50 group-hover:to-purple-50 dark:group-hover:from-blue-900/20 dark:group-hover:to-purple-900/20 transition-all">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Students</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{exam.stats.students}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 group-hover:bg-gradient-to-r group-hover:from-purple-50 group-hover:to-pink-50 dark:group-hover:from-purple-900/20 dark:group-hover:to-pink-900/20 transition-all">
                <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Questions</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{exam.stats.questions}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 group-hover:bg-gradient-to-r group-hover:from-green-50 group-hover:to-emerald-50 dark:group-hover:from-green-900/20 dark:group-hover:to-emerald-900/20 transition-all">
                <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{exam.stats.duration}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 group-hover:bg-gradient-to-r group-hover:from-orange-50 group-hover:to-red-50 dark:group-hover:from-orange-900/20 dark:group-hover:to-red-900/20 transition-all">
                <Target className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Level</p>
                    <DifficultyBadge difficulty={exam.stats.difficulty} />
                  </div>
                </div>
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-3">
              {exam.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 group/item"
                  style={{
                    animation: isVisible ? 'slide-in-feature 0.5s ease-out forwards' : 'none',
                    animationDelay: `${index * 150 + idx * 100 + 300}ms`,
                    opacity: isVisible ? 1 : 0
                  }}
                >
                  <CheckCircle2 className={`w-4 h-4 ${exam.color} flex-shrink-0 group-hover/item:scale-125 transition-transform`} />
                  <span className="text-sm text-gray-600 dark:text-gray-400 group-hover/item:text-gray-900 dark:group-hover/item:text-white transition-colors">
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <Link href={`/exams/${exam.id}`}>
              <button className={`w-full py-4 rounded-xl bg-gradient-to-r ${exam.gradient} text-white font-bold shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group/btn relative overflow-hidden`}>
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                
                <span className="relative flex items-center justify-center gap-2">
                  Start Practicing
                  <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                </span>
              </button>
            </Link>
          </div>

          {/* Decorative corner elements */}
          <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${exam.gradient} opacity-5 rounded-bl-full`} />
          <div className={`absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr ${exam.gradient} opacity-5 rounded-tr-full`} />
        </div>
      </div>
    </div>
  )
}

export function PopularExams() {
  const [isVisible, setIsVisible] = useState(false)
  const [activeCategory, setActiveCategory] = useState<'all' | 'engineering' | 'medical'>('all')
  const sectionRef = useRef<HTMLDivElement>(null)

  const filteredExams = activeCategory === 'all' 
    ? exams 
    : exams.filter(exam => exam.category === activeCategory)

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
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [isVisible])

  return (
    <section
      ref={sectionRef}
      id="exams"
      className="relative py-20 md:py-8 bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden"
    >
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -right-48 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -left-48 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl animate-pulse animation-delay-2000" />
        
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
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section header */}
        <div className="text-center space-y-6 mb-12 md:mb-10">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-800 shadow-lg">
            <Trophy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
              Most Popular Exams
            </span>
          </div>

          {/* Main heading */}
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight">
              Prepare for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient-x">
                JEE & NEET
              </span>
            </h2>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Premium mock tests designed by experts for engineering and medical entrance exams
            </p>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap justify-center gap-3 pt-6">
            {[
              { id: 'all', label: 'All Exams', icon: <Sparkles className="w-4 h-4" /> },
              { id: 'engineering', label: 'Engineering', icon: <Calculator className="w-4 h-4" /> },
              { id: 'medical', label: 'Medical', icon: <Microscope className="w-4 h-4" /> }
            ].map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                  activeCategory === category.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-gray-200 dark:border-gray-700'
                }`}
              >
                {category.icon}
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Exams grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {filteredExams.map((exam, index) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              index={index}
              isVisible={isVisible}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 text-center space-y-6">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Want to explore more exams?
          </p>
          
          <Link href="/exams">
            <button className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold text-lg shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 overflow-hidden">
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              <span className="relative">View All 450+ Exams</span>
              <Zap className="relative w-6 h-6 group-hover:rotate-12 transition-transform" />
            </button>
          </Link>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes card-entrance {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        @keyframes particle-float {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0);
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(-200px) translateX(50px) scale(1.5);
          }
        }

        @keyframes slide-in-feature {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
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

        .animate-card-entrance {
          animation: card-entrance 0.8s ease-out forwards;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .animate-particle-float {
          animation: particle-float linear forwards;
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