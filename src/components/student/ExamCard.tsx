// src/components/student/ExamCard.tsx
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, FileText, Star, Users } from 'lucide-react'

interface ExamCardProps {
  exam: {
    id: string
    title: string
    slug: string
    subject: string
    thumbnail: string
    duration: number
    totalQuestions: number
    difficulty: string
    price: number
    isFree: boolean
    rating: number
    totalAttempts: number
  }
}

export function ExamCard({ exam }: ExamCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-xl transition-shadow group h-full flex flex-col">
      <CardHeader className="p-0">
        <div className="relative h-48 w-full overflow-hidden">
          <Image
            src={exam.thumbnail}
            alt={exam.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {exam.isFree && (
            <Badge className="absolute top-4 left-4 bg-green-500">
              Free
            </Badge>
          )}
          <Badge 
            className="absolute top-4 right-4"
            variant={
              exam.difficulty === 'easy' 
                ? 'secondary' 
                : exam.difficulty === 'medium' 
                ? 'default' 
                : 'destructive'
            }
          >
            {exam.difficulty}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4 flex-1">
        <div>
          <Badge variant="outline" className="mb-2">
            {exam.subject}
          </Badge>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors">
            {exam.title}
          </h3>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{exam.duration} min</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            <span>{exam.totalQuestions} questions</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{exam.rating}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <Users className="w-4 h-4" />
            <span>{exam.totalAttempts.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0 flex gap-2">
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/exams/${exam.slug}`}>
            Details
          </Link>
        </Button>
        <Button asChild className="flex-1">
          <Link href={`/exams/${exam.slug}`}>
            {exam.isFree ? 'Start Free' : `₹${exam.price/100}`}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}