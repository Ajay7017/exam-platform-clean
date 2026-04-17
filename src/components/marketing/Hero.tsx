// src/components/marketing/Hero.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  ArrowRight, 
  Sparkles, 
  BookOpen,
  Shield,
  Zap,
  Target,
  Activity,
  GraduationCap,
  ChevronDown,
  BarChart3
} from 'lucide-react'

// Typewriter effect hook
function useTypewriter(words: string[], typingSpeed = 100, deletingSpeed = 50, pauseTime = 2000) {
  const [displayText, setDisplayText] = useState('')
  const [wordIndex, setWordIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentWord = words[wordIndex]
    
    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (displayText.length < currentWord.length) {
          setDisplayText(currentWord.slice(0, displayText.length + 1))
        } else {
          setTimeout(() => setIsDeleting(true), pauseTime)
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(currentWord.slice(0, displayText.length - 1))
        } else {
          setIsDeleting(false)
          setWordIndex((prev) => (prev + 1) % words.length)
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed)

    return () => clearTimeout(timer)
  }, [displayText, isDeleting, wordIndex, words, typingSpeed, deletingSpeed, pauseTime])

  return displayText
}

// Floating particles component (Restored Original Colors)
function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    class Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      opacity: number

      constructor() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.size = Math.random() * 3 + 1
        this.speedX = Math.random() * 0.5 - 0.25
        this.speedY = Math.random() * 0.5 - 0.25
        this.opacity = Math.random() * 0.5 + 0.2
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY

        if (this.x > canvas.width) this.x = 0
        if (this.x < 0) this.x = canvas.width
        if (this.y > canvas.height) this.y = 0
        if (this.y < 0) this.y = canvas.height
      }

      draw() {
        if (!ctx) return
        ctx.fillStyle = `rgba(99, 102, 241, ${this.opacity})` // Original Indigo
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const particles: Particle[] = []
    for (let i = 0; i < 50; i++) {
      particles.push(new Particle())
    }

    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      particles.forEach(particle => {
        particle.update()
        particle.draw()
      })
      
      requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.4 }}
    />
  )
}

const EXAM_OPTIONS = [
  { id: 'jee-main', label: 'JEE Main', icon: <Target className="w-4 h-4"/> },
  { id: 'jee-advanced', label: 'JEE Advanced', icon: <Zap className="w-4 h-4"/> },
  { id: 'neet-ug', label: 'NEET UG', icon: <Activity className="w-4 h-4"/> },
  { id: 'class-12', label: 'Class 12th', icon: <BookOpen className="w-4 h-4"/> },
  { id: 'class-11', label: 'Class 11th', icon: <GraduationCap className="w-4 h-4"/> },
]

export function Hero() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const [selectedExam, setSelectedExam] = useState(EXAM_OPTIONS[0])
  const heroRef = useRef<HTMLDivElement>(null)

  const dynamicWord = useTypewriter(['JEE Main', 'NEET UG', 'JEE Advanced', 'Class 12th', 'Class 11th'], 80, 40, 2500)

  // Mouse move effect for gradient follow
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect()
        setMousePosition({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100
        })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const scrollToContent = () => {
    const element = document.getElementById('exams')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.scrollTo({
        top: window.innerHeight - 80,
        behavior: 'smooth'
      })
    }
  }

  return (
    <section 
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white dark:bg-gray-950"
    >
      {/* Restored Original Vibrant Animated Gradient Background */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950"
        style={{
          backgroundPosition: `${mousePosition.x}% ${mousePosition.y}%`,
          transition: 'background-position 0.3s ease-out'
        }}
      >
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(99, 102, 241) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(99, 102, 241) 1px, transparent 1px)
            `,
            backgroundSize: '4rem 4rem'
          }}
        />
      </div>

      <FloatingParticles />

      {/* Restored Original Vibrant Floating Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-30 animate-blob" />
      <div className="absolute top-40 right-10 w-72 h-72 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-gradient-to-r from-indigo-400 to-blue-400 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center mt-12">
        <div className="space-y-8 animate-fade-in-up">
          
          {/* Trust Badge - Keeping the Value Proposition text */}
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Strict Exam Environment
              </span>
            </div>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                Latest 2026 NTA Pattern
              </span>
            </div>
          </div>

          {/* Main Headline with Typewriter */}
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
              Ace Your{' '}
              <span className="relative inline-block min-w-[280px] text-left">
                {/* Restored Purple/Pink Gradient on Text */}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient-x">
                  {dynamicWord}
                </span>
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-[1em] bg-blue-600 animate-blink" />
              </span>
              <br />
              <span className="relative">
                Preparation
              </span>
            </h1>
            
            <p className="max-w-3xl mx-auto text-xl sm:text-2xl lg:text-3xl text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
              Targeted mock tests, detailed solutions, and{' '}
              <span className="font-bold text-purple-600 dark:text-purple-400">instant All-India rank prediction.</span>
            </p>
          </div>

          {/* Interactive Intent Catcher (Selector) */}
          <div className="pt-6 pb-2">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              What are you preparing for?
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {EXAM_OPTIONS.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => setSelectedExam(exam)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-full border transition-all duration-300 text-sm font-medium shadow-sm hover:shadow-md
                    ${selectedExam.id === exam.id 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 border-transparent text-white scale-105 shadow-purple-500/25' 
                      : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                    }`}
                >
                  {exam.icon}
                  {exam.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
            {/* Primary CTA - Routes to Login */}
            <Link href="/exams">
              <div
                className="group relative px-8 py-5 text-lg font-semibold rounded-full overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-2xl hover:shadow-purple-500/40 transition-all duration-300 hover:scale-105 cursor-pointer flex items-center justify-center w-fit"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative flex items-center gap-3">
                  <Sparkles className="w-5 h-5" />
                  Start {selectedExam.label} Mock Test
                  <ArrowRight className={`w-5 h-5 transition-transform duration-300 ${isHovering ? 'translate-x-1' : ''}`} />
                </span>
              </div>
            </Link>

            {/* Secondary CTA */}
            <button
              onClick={scrollToContent}
              className="group px-8 py-5 text-lg font-semibold bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-full hover:scale-105 flex items-center gap-3"
            >
              <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Browse Exams
            </button>
          </div>

          {/* Value Highlights */}
          <div className="pt-12 flex flex-wrap justify-center gap-4 sm:gap-6 text-sm sm:text-base">
            {[
              { icon: <Target className="w-4 h-4" />, label: 'Chapter-wise Mocks', highlight: 'Physics, Chem, Math, Bio' },
              { icon: <BarChart3 className="w-4 h-4" />, label: 'Detailed Analytics', highlight: 'Weak-point tracking' },
              { icon: <Zap className="w-4 h-4" />, label: 'Expert Solutions', highlight: 'Step-by-step guidance' }
            ].map((stat, idx) => (
              <div key={idx} className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="text-purple-600 dark:text-purple-400">
                  {stat.icon}
                </div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  <span className="font-bold text-gray-900 dark:text-white">{stat.label}</span> • {stat.highlight}
                </span>
              </div>
            ))}
          </div>

          {/* Scroll Down Indicator */}
          <div className="pt-8 animate-bounce">
            <button
              onClick={scrollToContent}
              className="mx-auto flex flex-col items-center gap-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors group"
              aria-label="Scroll to content"
            >
              <ChevronDown className="w-6 h-6 group-hover:translate-y-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-gray-950 to-transparent pointer-events-none" />

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -20px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(20px, 20px) scale(1.05); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out; }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
        .animate-blink { animation: blink 1s step-end infinite; }
      `}</style>
    </section>
  )
}