// src/components/marketing/Pricing.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Sparkles } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: '0',
    description: 'Perfect for getting started',
    features: [
      'Access to 50+ free exams',
      'Basic performance analytics',
      'Question-wise explanations',
      'Leaderboard access',
      'Community support'
    ],
    cta: 'Start Free',
    href: '/exams',
    popular: false
  },
  {
    name: 'Pro',
    price: '499',
    description: 'Best for serious exam preparation',
    features: [
      'Access to all 450+ exams',
      'Advanced analytics & insights',
      'Topic-wise practice mode',
      'Downloadable result PDFs',
      'Priority email support',
      'Ad-free experience',
      'Performance comparison'
    ],
    cta: 'Start Pro Trial',
    href: '/pricing',
    popular: true
  },
  {
    name: 'Ultimate',
    price: '999',
    description: 'For comprehensive exam mastery',
    features: [
      'Everything in Pro',
      'Personalized study plans',
      'AI-powered recommendations',
      'Live doubt clearing sessions',
      'Exclusive master classes',
      '1-on-1 mentorship (monthly)',
      'Certificate of completion',
      'Lifetime access to content'
    ],
    cta: 'Go Ultimate',
    href: '/pricing',
    popular: false
  }
]

export function Pricing() {
  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Choose the plan that fits your preparation needs. All plans include our core features
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={`relative ${
                plan.popular 
                  ? 'border-2 border-blue-500 shadow-xl scale-105' 
                  : 'border-2 hover:border-gray-300 dark:hover:border-gray-600'
              } transition-all`}
            >
              {plan.popular && (
                <div className="absolute -top-5 left-0 right-0 flex justify-center">
                  <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-gray-900 dark:text-white">
                    ₹{plan.price}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">/month</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button 
                  asChild 
                  className="w-full" 
                  variant={plan.popular ? 'default' : 'outline'}
                  size="lg"
                >
                  <Link href={plan.href}>
                    {plan.cta}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Money back guarantee */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            All paid plans come with a <span className="font-semibold text-gray-900 dark:text-white">7-day money-back guarantee</span>
          </p>
        </div>
      </div>
    </section>
  )
}