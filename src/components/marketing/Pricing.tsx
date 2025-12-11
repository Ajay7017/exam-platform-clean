'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { 
  Check,
  X,
  Sparkles,
  Zap,
  Crown,
  Target,
  Lock,
  Unlock,
  ArrowRight,
  TrendingUp,
  Shield,
  Award,
  Users
} from 'lucide-react'

interface PricingTier {
  id: string
  name: string
  tagline: string
  icon: React.ReactNode
  price: string
  priceDetail: string
  description: string
  features: {
    text: string
    included: boolean
    highlight?: boolean
  }[]
  cta: string
  ctaLink: string
  popular?: boolean
  gradient: string
  color: string
  badge?: string
}

const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free Practice',
    tagline: 'Get started with basics',
    icon: <Unlock className="w-6 h-6" />,
    price: '₹0',
    priceDetail: 'Forever free',
    description: 'Perfect for exploring the platform and trying out sample questions',
    features: [
      { text: 'Access to 50+ free mock tests', included: true },
      { text: '5,000+ practice questions', included: true },
      { text: 'Basic performance analytics', included: true },
      { text: 'Community leaderboards', included: true },
      { text: 'Limited subject coverage', included: true },
      { text: 'Detailed explanations', included: false },
      { text: 'Full-length mock exams', included: false },
      { text: 'AI-powered recommendations', included: false },
      { text: 'Topic-wise deep analysis', included: false },
      { text: 'Priority support', included: false }
    ],
    cta: 'Start Free Practice',
    ctaLink: '/login',
    gradient: 'from-gray-500 to-gray-600',
    color: 'text-gray-600'
  },
  {
    id: 'premium',
    name: 'Premium Access',
    tagline: 'Unlock your full potential',
    icon: <Crown className="w-6 h-6" />,
    price: 'Pay Per Exam',
    priceDetail: 'Individual exam pricing',
    description: 'Choose and purchase only the exams you need. Prices vary by exam complexity',
    features: [
      { text: 'Access to ALL 450+ exams', included: true, highlight: true },
      { text: '200,000+ premium questions', included: true, highlight: true },
      { text: 'Full-length mock tests', included: true },
      { text: 'Detailed answer explanations', included: true },
      { text: 'AI-powered recommendations', included: true },
      { text: 'Advanced performance analytics', included: true },
      { text: 'Topic-wise strength analysis', included: true },
      { text: 'Anti-cheat exam environment', included: true },
      { text: 'Lifetime access to purchased exams', included: true },
      { text: 'Priority email support', included: true }
    ],
    cta: 'View Exam Catalog',
    ctaLink: '/exams',
    popular: true,
    // badge: 'Most Popular',
    gradient: 'from-blue-600 to-purple-600',
    color: 'text-blue-600'
  }
]

// Feature comparison table
const comparisonFeatures = [
  { name: 'Practice Questions', free: '5,000+', premium: '200,000+' },
  { name: 'Mock Tests', free: '50+', premium: '450+' },
  { name: 'Detailed Explanations', free: 'Limited', premium: 'All Questions' },
  { name: 'Performance Analytics', free: 'Basic', premium: 'Advanced AI' },
  { name: 'Exam Environment', free: 'Standard', premium: 'Anti-Cheat' },
  { name: 'Support', free: 'Community', premium: 'Priority' }
]

// Individual pricing card
function PricingCard({ tier, index, isVisible }: { tier: PricingTier; index: number; isVisible: boolean }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={`pricing-card ${isVisible ? 'animate-fade-in-up' : 'opacity-0'} ${tier.popular ? 'popular' : ''}`}
      style={{
        animationDelay: `${index * 200}ms`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Popular badge */}
      {tier.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
          <div className={`flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r ${tier.gradient} text-white font-bold text-sm shadow-xl`}>
            <Sparkles className="w-4 h-4" />
            <span>{tier.badge}</span>
          </div>
        </div>
      )}

      {/* Card container */}
      <div className={`relative h-full rounded-3xl border-2 ${
        tier.popular 
          ? 'border-transparent bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50' 
          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
      } transition-all duration-500 hover:shadow-2xl ${
        tier.popular ? 'scale-105 shadow-xl' : 'hover:scale-105'
      } overflow-hidden group`}>
        
        {/* Gradient border for popular */}
        {tier.popular && (
          <div className={`absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl`} 
            style={{ padding: '2px', zIndex: -1 }}
          />
        )}

        {/* Background glow */}
        {tier.popular && (
          <div className={`absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
        )}

        {/* Content */}
        <div className="relative p-8 lg:p-10 space-y-6">
          
          {/* Header */}
          <div className="space-y-4">
            {/* Icon */}
            <div className={`inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br ${tier.gradient} items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
              {tier.icon}
            </div>

            {/* Name and tagline */}
            <div>
              <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {tier.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {tier.tagline}
              </p>
            </div>

            {/* Price */}
            <div className="py-4">
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl lg:text-5xl font-extrabold bg-gradient-to-r ${tier.gradient} bg-clip-text text-transparent`}>
                  {tier.price}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {tier.priceDetail}
              </p>
            </div>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {tier.description}
            </p>
          </div>

          {/* CTA Button */}
          <Link href={tier.ctaLink}>
            <button className={`w-full py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 ${
              tier.popular
                ? `bg-gradient-to-r ${tier.gradient} text-white shadow-lg hover:shadow-xl hover:scale-105`
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
            } flex items-center justify-center gap-2 group/button`}>
              <span>{tier.cta}</span>
              <ArrowRight className="w-5 h-5 group-hover/button:translate-x-1 transition-transform" />
            </button>
          </Link>

          {/* Features list */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              What's included:
            </p>
            <ul className="space-y-3">
              {tier.features.map((feature, idx) => (
                <li
                  key={idx}
                  className={`flex items-start gap-3 text-sm ${
                    feature.included 
                      ? 'text-gray-700 dark:text-gray-300' 
                      : 'text-gray-400 dark:text-gray-600'
                  } ${feature.highlight ? 'font-semibold' : ''}`}
                >
                  {feature.included ? (
                    <Check className={`w-5 h-5 flex-shrink-0 ${
                      feature.highlight 
                        ? `bg-gradient-to-br ${tier.gradient} text-white rounded-full p-0.5` 
                        : tier.color
                    }`} />
                  ) : (
                    <X className="w-5 h-5 flex-shrink-0 text-gray-300 dark:text-gray-700" />
                  )}
                  <span>{feature.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Pricing() {
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
      id="pricing"
      className="relative py-20 md:py-10 bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 overflow-hidden"
    >
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse animation-delay-2000" />
        
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
          {/* <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-800 shadow-lg">
            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
              Flexible Pricing
            </span>
          </div> */}

          {/* Main heading */}
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight">
              Choose Your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient-x">
                Learning Path
              </span>
            </h2>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Start for free, then purchase only the exams you need
            </p>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-6 pt-4">
            {[
              { icon: <Shield className="w-4 h-4" />, text: 'Secure payments' },
              { icon: <Award className="w-4 h-4" />, text: 'Lifetime access' },
              { icon: <Users className="w-4 h-4" />, text: '50,000+ students' }
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

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto mb-16">
          {pricingTiers.map((tier, index) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              index={index}
              isVisible={isVisible}
            />
          ))}
        </div>

        {/* Comparison table */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
            Detailed Comparison
          </h3>
          
          <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Feature
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                      Free
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                      Premium
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {comparisonFeatures.map((feature, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {feature.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-gray-600 dark:text-gray-400">
                        {feature.free}
                      </td>
                      <td className="px-6 py-4 text-sm text-center font-semibold text-blue-600 dark:text-blue-400">
                        {feature.premium}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Login prompt for pricing */}
        <div className="mt-16 max-w-2xl mx-auto text-center">
          <div className="p-8 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
            <Lock className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Individual Exam Pricing
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Login to view detailed pricing for each exam. Prices vary from ₹99 to ₹999 based on exam complexity and question count.
            </p>
            <Link href="/login">
              <button className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <Lock className="w-4 h-4" />
                <span>Login to View Prices</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Have questions about pricing?
          </p>
          <Link href="/#about">
            <button className="group inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold hover:gap-3 transition-all">
              <span>Contact our team</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
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

        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .pricing-card {
          position: relative;
        }

        .pricing-card.popular {
          padding-top: 1rem;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
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