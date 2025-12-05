// src/components/student/WelcomeCard.tsx
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Flame, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export function WelcomeCard() {
  return (
    <Card className="bg-gradient-to-br from-blue-600 to-purple-600 text-white border-0">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">Welcome back, Student!</h2>
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                <Flame className="w-4 h-4 text-orange-300" />
                <span className="text-sm font-semibold">7 day streak</span>
              </div>
            </div>
            <p className="text-white/90">
              You're doing great! Keep practicing to maintain your streak.
            </p>
            <div className="flex gap-3 pt-2">
              <Button 
                asChild
                variant="secondary" 
                className="bg-white text-blue-600 hover:bg-white/90"
              >
                <Link href="/exams">
                  Continue Practice
                </Link>
              </Button>
              <Button 
                asChild
                variant="outline" 
                className="border-white/30 text-white hover:bg-white/10"
              >
                <Link href="/results">
                  View Results
                </Link>
              </Button>
            </div>
          </div>
          <div className="hidden md:flex items-center justify-center w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm">
            <TrendingUp className="w-12 h-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}