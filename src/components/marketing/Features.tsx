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
  Sparkles,
  CheckCircle2
} from 'lucide-react'

interface Feature {
  icon: React.ReactNode
  title: string
  description: string
  // color prop is no longer strictly needed for text, as we use white, 
  // but kept for potential future use or consistency.
  color: string 
  gradient: string
  highlights: string[]
}

const features: Feature[] = [
  {
    icon: <Brain className="w-8 h-8" />,
    title: 'AI-Powered Learning',
    description: 'Intelligent question recommendations based on your weak areas.',
    color: 'text-purple-600',
    gradient: 'from-purple-600 to-pink-600',
    highlights: ['Smart recommendations', 'Personalized learning path', 'Adaptive difficulty']
  },
  {
    icon: <BarChart3 className="w-8 h-8" />,
    title: 'Real-time Analytics',
    description: 'Track your performance with detailed insights and progress graphs.',
    color: 'text-blue-600',
    gradient: 'from-blue-600 to-cyan-600',
    highlights: ['Topic-wise analysis', 'Performance trends', 'Strength indicators']
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: 'Anti-Cheat System',
    description: 'Secure exam environment with full-screen enforcement.',
    color: 'text-red-600',
    gradient: 'from-red-600 to-orange-600',
    highlights: ['Tab monitoring', 'Screenshot prevention', 'Three-strike policy']
  },
  {
    icon: <Zap className="w-8 h-8" />,
    title: 'Instant Results',
    description: 'Get detailed results immediately after test completion.',
    color: 'text-yellow-600',
    gradient: 'from-yellow-500 to-orange-500',
    highlights: ['Immediate grading', 'Answer explanations', 'Solution walkthroughs']
  },
  {
    icon: <Users2 className="w-8 h-8" />,
    title: 'Live Leaderboards',
    description: 'Compete with thousands of students and see where you stand.',
    color: 'text-green-600',
    gradient: 'from-green-600 to-emerald-600',
    highlights: ['National rankings', 'Subject-wise boards', 'Real-time updates']
  },
  {
    icon: <Award className="w-8 h-8" />,
    title: 'Expert Content',
    description: 'Questions curated by subject experts with detailed solutions.',
    color: 'text-indigo-600',
    gradient: 'from-indigo-600 to-purple-600',
    highlights: ['Expert-verified', '200K+ questions', 'Detailed solutions']
  }
]

function FeatureCard({ feature, index, isVisible }: { feature: Feature; index: number; isVisible: boolean }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={`relative group ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}
      style={{ animationDelay: `${index * 100}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Card Container with Gradient Background */}
      <div 
        className={`relative h-full rounded-3xl overflow-hidden shadow-xl transition-all duration-500 ${isHovered ? 'shadow-2xl scale-[1.02]' : 'shadow-lg'}`}
      >
         {/* The specific colored gradient background */}
         <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient}`} />

         {/* Optional: Subtle pattern overlay from original design */}
         <div 
             className="absolute inset-0 opacity-10 mix-blend-overlay"
             style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: '20px 20px' }}
         />

        {/* Content Container - Text is now white */}
        <div className="relative h-full p-6 flex flex-col items-center text-center z-10 text-white">
          
          {/* Icon Section - Glassmorphism style */}
          <div className="mb-6 p-4 rounded-2xl bg-white/20 backdrop-blur-md shadow-lg transform transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
              {feature.icon}
          </div>

          {/* Title & Description */}
          <h3 className="text-2xl font-bold mb-3 drop-shadow-sm">
            {feature.title}
          </h3>
          <p className="text-white/90 text-sm leading-relaxed mb-8 flex-grow font-medium">
            {feature.description}
          </p>

          {/* EMBEDDED KEY FEATURES BOX - Darker Glassmorphism */}
          <div className="w-full bg-black/20 rounded-xl p-5 border border-white/10 backdrop-blur-md shadow-inner transition-all duration-300 group-hover:bg-black/30 group-hover:border-white/20">
            <div className="flex items-center gap-2 mb-4 justify-center text-white/90">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Key Features</span>
            </div>
            
            {/* Highlights List - White checkmarks and text */}
            <div className="space-y-3 text-left">
              {feature.highlights.map((highlight, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm text-white font-medium">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-white drop-shadow-sm mt-0.5" />
                  <span className="leading-tight">{highlight}</span>
                </div>
              ))}
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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) setIsVisible(true)
        })
      },
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [isVisible])

  return (
    <section ref={sectionRef} id="features" className="relative py-8 bg-gray-50/50 dark:bg-gray-950 overflow-hidden">
      {/* Background Gradients for the section */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[100px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 text-sm font-semibold mb-6">
            <Target className="w-4 h-4" />
            <span>Why Choose Us?</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight leading-tight">
            Everything you need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">Succeed</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 font-medium">
            Powerful features designed to help you prepare smarter and achieve your goals faster.
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              feature={feature}
              index={index}
              isVisible={isVisible}
            />
          ))}
        </div>

      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>
    </section>
  )
}