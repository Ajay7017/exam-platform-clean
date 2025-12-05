// src/components/marketing/Testimonials.tsx
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Star } from 'lucide-react'

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'GATE CS 2024 - AIR 47',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
    content: 'The mock tests were incredibly close to the actual GATE exam. The detailed analytics helped me identify my weak areas and improve systematically. Highly recommended!',
    rating: 5
  },
  {
    name: 'Rahul Verma',
    role: 'SSC CGL 2023 - Selected',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul',
    content: 'I practiced over 5000 questions on this platform. The question quality is excellent and the exam interface is very similar to the actual SSC exam. Thank you!',
    rating: 5
  },
  {
    name: 'Ananya Patel',
    role: 'JEE Advanced 2024 - AIR 128',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya',
    content: 'The best part is the instant results with detailed solutions. Every question has a clear explanation which helped me understand concepts better.',
    rating: 5
  },
  {
    name: 'Vikram Singh',
    role: 'NEET 2024 - AIR 342',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram',
    content: 'Affordable pricing and excellent content quality. The anti-cheat system made the practice sessions feel like real exams. Prepared me mentally for D-day!',
    rating: 5
  },
  {
    name: 'Sneha Reddy',
    role: 'UPSC CSE 2023 - Rank 89',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha',
    content: 'The comprehensive question bank covering all subjects helped me practice consistently. The leaderboard feature kept me motivated throughout my preparation.',
    rating: 5
  },
  {
    name: 'Arjun Mehta',
    role: 'CAT 2023 - 99.8 Percentile',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun',
    content: 'Smart practice feature is a game-changer! It focused on my weak areas automatically. Got my dream IIM because of systematic preparation here.',
    rating: 5
  }
]

export function Testimonials() {
  return (
    <section className="py-20 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
            Success Stories
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Join thousands of students who achieved their dreams with our platform
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 space-y-4">
                {/* Stars */}
                <div className="flex gap-1">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Content */}
                <p className="text-gray-600 dark:text-gray-400 italic">
                  "{testimonial.content}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Avatar>
                    <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                    <AvatarFallback>{testimonial.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}