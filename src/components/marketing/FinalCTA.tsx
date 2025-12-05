// src/components/marketing/FinalCTA.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles } from 'lucide-react'

export function FinalCTA() {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
      
      {/* Floating shapes */}
      <div className="absolute top-0 left-20 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 right-20 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium">
            <Sparkles className="w-4 h-4 mr-2" />
            Join 50,000+ successful students
          </div>

          {/* Heading */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Ready to Ace Your Exam?
          </h2>

          {/* Description */}
          <p className="text-xl sm:text-2xl text-white/90 max-w-2xl mx-auto">
            Start practicing today with our comprehensive question bank and smart analytics
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button 
              asChild 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6 group shadow-xl"
            >
              <Link href="/exams">
                Start Free Practice
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button 
              asChild 
              size="lg" 
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-6"
            >
              <Link href="/pricing">
                View Pricing
              </Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="pt-8 flex flex-wrap justify-center gap-6 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>7-day money-back guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}