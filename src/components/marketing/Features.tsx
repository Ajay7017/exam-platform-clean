'use client'

import { useEffect, useState, useRef } from 'react'
import { 
  Brain, 
  BarChart3, 
  Shield, 
  Zap, 
  Users2, 
  Award,
  Target,
  Clock,
  TrendingUp,
  Lock,
  Sparkles,
  CheckCircle2
} from 'lucide-react'

interface Feature {
  icon: React.ReactNode
  title: string
  description: string
  color: string
  gradient: string
  highlights: string[]
}

const features: Feature[] = [
  {
    icon: <Brain className="w-8 h-8" />,
    title: 'AI-Powered Learning',
    description: 'Intelligent question recommendations based on your weak areas and learning patterns',
    color: 'text-purple-600',
    gradient: 'from-purple-500 to-pink-500',
    highlights: ['Smart recommendations', 'Personalized learning path', 'Adaptive difficulty']
  },
  {
    icon: <BarChart3 className="w-8 h-8" />,
    title: 'Real-time Analytics',
    description: 'Track your performance with detailed insights, topic-wise accuracy, and progress graphs',
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-cyan-500',
    highlights: ['Topic-wise analysis', 'Performance trends', 'Strength indicators']
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: 'Anti-Cheat System',
    description: 'Secure exam environment with full-screen enforcement and tab monitoring',
    color: 'text-red-600',
    gradient: 'from-red-500 to-orange-500',
    highlights: ['Tab monitoring', 'Screenshot prevention', 'Three-strike policy']
  },
  {
    icon: <Zap className="w-8 h-8" />,
    title: 'Instant Results',
    description: 'Get detailed results immediately after test completion with comprehensive explanations',
    color: 'text-yellow-600',
    gradient: 'from-yellow-500 to-orange-500',
    highlights: ['Immediate grading', 'Answer explanations', 'Solution walkthroughs']
  },
  {
    icon: <Users2 className="w-8 h-8" />,
    title: 'Live Leaderboards',
    description: 'Compete with thousands of students and see where you stand nationally',
    color: 'text-green-600',
    gradient: 'from-green-500 to-emerald-500',
    highlights: ['National rankings', 'Subject-wise boards', 'Real-time updates']
  },
  {
    icon: <Award className="w-8 h-8" />,
    title: 'Expert Content',
    description: 'Questions curated by subject experts with detailed solutions and concepts',
    color: 'text-indigo-600',
    gradient: 'from-indigo-500 to-purple-500',
    highlights: ['Expert-verified', '200K+ questions', 'Detailed solutions']
  }
]

// Feature card component with flip animation
function FeatureCard({ feature, index, isVisible }: { feature: Feature; index: number; isVisible: boolean }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={`feature-card-wrapper ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}
      style={{
        animationDelay: `${index * 150}ms`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={`feature-card ${isFlipped ? 'flipped' : ''}`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front Side */}
        <div className="feature-card-face feature-card-front">
          <div className="relative h-full p-8 rounded-2xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-transparent transition-all duration-500 group overflow-hidden">
            
            {/* Animated background gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
            
            {/* Floating particles on hover */}
            {isHovered && (
              <>
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`absolute w-1 h-1 bg-gradient-to-br ${feature.gradient} rounded-full animate-float`}
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${i * 0.3}s`,
                      animationDuration: `${2 + Math.random() * 2}s`
                    }}
                  />
                ))}
              </>
            )}

            {/* Content */}
            <div className="relative space-y-6">
              {/* Icon with animated ring */}
              <div className="relative inline-block">
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 animate-pulse`} />
                <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white shadow-lg group-hover:shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                  {feature.icon}
                </div>
                
                {/* Rotating border */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 animate-spin-slow`} 
                  style={{ padding: '2px', zIndex: -1 }}
                />
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {feature.description}
              </p>

              {/* Click indicator */}
              <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                <Sparkles className="w-4 h-4" />
                <span>Click to see details</span>
              </div>

              {/* Decorative corner accent */}
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${feature.gradient} opacity-5 rounded-bl-full`} />
            </div>
          </div>
        </div>

        {/* Back Side */}
        <div className="feature-card-face feature-card-back">
          <div className={`relative h-full p-8 rounded-2xl border-2 bg-gradient-to-br ${feature.gradient} overflow-hidden`}>
            
            {/* Pattern overlay */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                backgroundSize: '20px 20px'
              }}
            />

            {/* Content */}
            <div className="relative h-full flex flex-col justify-between text-white">
              
              {/* Header */}
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  {feature.icon}
                </div>
                
                <h3 className="text-2xl font-bold">
                  Key Features
                </h3>
              </div>

              {/* Highlights list */}
              <div className="space-y-3">
                {feature.highlights.map((highlight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 animate-slide-in"
                    style={{
                      animationDelay: `${idx * 100}ms`
                    }}
                  >
                    <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-medium">{highlight}</span>
                  </div>
                ))}
              </div>

              {/* Bottom */}
              <div className="pt-4 border-t border-white/20">
                <button className="w-full py-3 px-4 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors font-semibold text-sm">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Features() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  // Intersection Observer
  useEffect(() => {
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
      id="features"
      className="relative py-20 md:py-32 bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden"
    >
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse animation-delay-2000" />
        
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
        <div className="text-center space-y-6 mb-16 md:mb-20">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-800">
            <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
              Powerful Features
            </span>
          </div>

          {/* Main heading */}
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight">
              Everything You Need to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient-x">
                Succeed
              </span>
            </h2>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Powerful features designed to help you prepare smarter and achieve your goals faster
            </p>
          </div>

          {/* Stats line */}
          <div className="flex flex-wrap justify-center gap-6 pt-4">
            {[
              { icon: <Lock className="w-4 h-4" />, text: 'Bank-level Security' },
              { icon: <Clock className="w-4 h-4" />, text: 'Available 24/7' },
              { icon: <TrendingUp className="w-4 h-4" />, text: 'Proven Results' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="text-blue-600 dark:text-blue-400">
                  {item.icon}
                </div>
                <span className="font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              feature={feature}
              index={index}
              isVisible={isVisible}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 md:mt-20 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Ready to experience these powerful features?
          </p>
          <button className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative">Start Free Trial</span>
            <Sparkles className="relative w-5 h-5 group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      </div>

      {/* Custom styles */}
      <style jsx>{`
        .feature-card-wrapper {
          perspective: 1000px;
          height: 400px;
        }

        .feature-card {
          width: 100%;
          height: 100%;
          position: relative;
          transition: transform 0.8s;
          transform-style: preserve-3d;
          cursor: pointer;
        }

        .feature-card.flipped {
          transform: rotateY(180deg);
        }

        .feature-card-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .feature-card-back {
          transform: rotateY(180deg);
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translateY(-100px) translateX(20px);
          }
          90% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes slide-in {
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

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }

        .animate-float {
          animation: float linear infinite;
        }

        .animate-slide-in {
          animation: slide-in 0.5s ease-out forwards;
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