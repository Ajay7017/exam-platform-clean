// src/components/marketing/Testimonials.tsx 
'use client'

import { useEffect, useState, useRef } from 'react'
import { 
  Star,
  Quote,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Target,
  TrendingUp,
  Award,
  CheckCircle2,
  Sparkles
} from 'lucide-react'

interface Testimonial {
  id: number
  name: string
  role: string
  exam: string
  rank: string
  image: string
  rating: number
  text: string
  achievement: string
  color: string
  gradient: string
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Aryan Bansal',
    role: 'JEE Mains 2026',
    exam: 'JEE Mains',
    rank: '97.4 percentile',
    image: 'AB',
    rating: 5,
    text: 'The mock tests here are really close to the actual JEE pattern. I used to give full-length tests every weekend and review my mistakes using the solution tab. The topic-wise breakdown helped me fix my weak chapters in Physics.',
    achievement: 'Qualified for JEE Advanced',
    color: 'from-blue-500 to-cyan-500',
    gradient: 'from-blue-600 to-cyan-600'
  },
  {
    id: 2,
    name: 'Sneha Mittal',
    role: 'NEET UG 2026',
    exam: 'NEET UG',
    rank: '640 / 720',
    image: 'SM',
    rating: 5,
    text: 'Biology questions on this platform are very well organised by chapter and difficulty. I could target NCERT-based questions separately and then move to higher difficulty. My Biology score went from 280 to 340 in about two months.',
    achievement: 'Secured government college seat',
    color: 'from-green-500 to-emerald-500',
    gradient: 'from-green-600 to-emerald-600'
  },
  {
    id: 3,
    name: 'Rohan Malik',
    role: 'JEE Advanced 2026',
    exam: 'JEE Advanced',
    rank: 'Qualified',
    image: 'RM',
    rating: 5,
    text: 'What I liked most is the timer and the question palette — it feels exactly like the real exam interface. Practicing under time pressure made a big difference. The numerical answer type questions are also available here which most platforms skip.',
    achievement: 'IIT admission confirmed',
    color: 'from-purple-500 to-pink-500',
    gradient: 'from-purple-600 to-pink-600'
  },
  {
    id: 4,
    name: 'Divya Agarwal',
    role: 'NEET UG 2026',
    exam: 'NEET UG',
    rank: '595 / 720',
    image: 'DA',
    rating: 5,
    text: 'I gave NEET twice and failed to clear it the first time. This year I used this platform consistently for 4 months. The leaderboard kept me competitive and the detailed explanations after each test helped me understand where I was going wrong.',
    achievement: 'Cleared NEET in second attempt',
    color: 'from-orange-500 to-amber-500',
    gradient: 'from-orange-600 to-amber-600'
  },
  {
    id: 5,
    name: 'Kabir Khurana',
    role: 'JEE Mains 2026',
    exam: 'JEE Mains',
    rank: '94.1 percentile',
    image: 'KK',
    rating: 4,
    text: 'Good quality questions and the interface is clean. I especially liked that I could filter questions by topic and difficulty. Gave around 15 full mocks here before the actual exam. Chemistry organic section coverage is very thorough.',
    achievement: 'NIT admission secured',
    color: 'from-indigo-500 to-blue-500',
    gradient: 'from-indigo-600 to-blue-600'
  },
  {
    id: 6,
    name: 'Prachi Sharma',
    role: 'NEET UG 2026',
    exam: 'NEET UG',
    rank: '610 / 720',
    image: 'PS',
    rating: 5,
    text: 'The results page after each test is genuinely useful — it shows time spent per question, topic-wise accuracy, and compares you with others. I could see my progress over multiple attempts which kept me motivated during the last few weeks.',
    achievement: 'Private medical college admission',
    color: 'from-teal-500 to-cyan-500',
    gradient: 'from-teal-600 to-cyan-600'
  },
]

// Star rating component
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 ${
            i < rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300 dark:text-gray-600'
          } transition-all duration-300`}
        />
      ))}
    </div>
  )
}

// Individual testimonial card
function TestimonialCard({ testimonial, isActive }: { testimonial: Testimonial; isActive: boolean }) {
  return (
    <div className={`testimonial-card ${isActive ? 'active' : ''}`}>
      <div className="relative h-full p-8 lg:p-10 rounded-3xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-500 group overflow-hidden shadow-xl hover:shadow-2xl">
        
        {/* Background gradient glow */}
        <div className={`absolute inset-0 bg-gradient-to-br ${testimonial.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
        
        {/* Quote icon background */}
        <div className="absolute top-6 right-6 opacity-5 dark:opacity-10">
          <Quote className="w-32 h-32 text-gray-900 dark:text-white" />
        </div>

        {/* Content */}
        <div className="relative space-y-6">
          
          {/* Header section */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar with gradient border */}
              <div className="relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${testimonial.gradient} rounded-2xl blur-md opacity-50 group-hover:opacity-100 transition-opacity`} />
                <div className={`relative w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
                  {testimonial.image}
                </div>
              </div>

              {/* Name and role */}
              <div>
                <h4 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all">
                  {testimonial.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {testimonial.role}
                </p>
              </div>
            </div>

            {/* Rating */}
            <StarRating rating={testimonial.rating} />
          </div>

          {/* Achievement badge */}
          <div className="flex flex-wrap gap-3">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${testimonial.gradient} text-white text-sm font-bold shadow-lg`}>
              <Trophy className="w-4 h-4" />
              <span>{testimonial.rank}</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <Target className="w-4 h-4" />
              <span>{testimonial.exam}</span>
            </div>
          </div>

          {/* Testimonial text */}
          <blockquote className="text-gray-700 dark:text-gray-300 text-base lg:text-lg leading-relaxed italic">
            "{testimonial.text}"
          </blockquote>

          {/* Achievement highlight */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <CheckCircle2 className={`w-5 h-5 bg-gradient-to-br ${testimonial.gradient} text-white rounded-full p-1`} />
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              {testimonial.achievement}
            </span>
          </div>
        </div>

        {/* Decorative corner elements */}
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${testimonial.color} opacity-5 rounded-bl-full`} />
        <div className={`absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr ${testimonial.color} opacity-5 rounded-tr-full`} />
      </div>
    </div>
  )
}

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isAutoPlaying) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [isAutoPlaying])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) setIsVisible(true)
        })
      },
      { threshold: 0.2 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [isVisible])

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
    setIsAutoPlaying(false)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
    setIsAutoPlaying(false)
  }

  const handleDotClick = (index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
  }

  return (
    <section 
      ref={sectionRef}
      className="relative py-20 md:py-10 bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden"
    >
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-48 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -left-48 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse animation-delay-2000" />
        <div 
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle, #6366f1 1px, transparent 1px)`,
            backgroundSize: '30px 30px'
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section header */}
        <div className="text-center space-y-6 mb-16 md:mb-8">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-800 shadow-lg">
            <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-semibold text-purple-900 dark:text-purple-300">
              Student Reviews
            </span>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight">
              What Students{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 animate-gradient-x">
                Say About Us
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Real feedback from JEE and NEET aspirants who prepared with us
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-8 pt-4">
            {[
              { icon: <Trophy className="w-5 h-5" />, value: '5,000+', label: 'Students Enrolled' },
              { icon: <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />, value: '4.8/5', label: 'Average Rating' },
              { icon: <TrendingUp className="w-5 h-5" />, value: '1,200+', label: 'Mock Tests Taken' }
            ].map((stat, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                  {stat.icon}
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Carousel */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-3xl">
            <div 
              className="flex transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((testimonial, index) => (
                <div key={testimonial.id} className="w-full flex-shrink-0 px-2">
                  <TestimonialCard testimonial={testimonial} isActive={index === currentIndex} />
                </div>
              ))}
            </div>
          </div>

          {/* Navigation arrows */}
          <div className="hidden md:block">
            <button
              onClick={handlePrevious}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 hover:border-transparent transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 group"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-14 h-14 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 hover:border-transparent transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 group"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* Dots navigation */}
          <div className="flex justify-center gap-3 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={`transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-12 h-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full'
                    : 'w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>

          {/* Mobile navigation */}
          <div className="flex md:hidden justify-center gap-4 mt-8">
            <button
              onClick={handlePrevious}
              className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 hover:border-transparent transition-all duration-300 shadow-lg"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 hover:border-transparent transition-all duration-300 shadow-lg"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Start your preparation today with free mock tests
          </p>
          {/* <button className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative">Get Started Free</span>
            <Sparkles className="relative w-5 h-5 group-hover:rotate-12 transition-transform" />
          </button> */}
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .testimonial-card {
          transition: all 0.5s ease;
        }
        .testimonial-card.active {
          transform: scale(1);
        }
      `}</style>
    </section>
  )
}